(() => {
  const canvas = document.querySelector("#portrait-search");
  const traceCanvas = document.querySelector("#search-trace");
  const copy = document.querySelector(".copy");
  const headline = copy?.querySelector("h1");
  const biography = copy?.querySelector("p");
  const portraitFrame = document.querySelector(".search-portrait__canvas");
  const photoLinks = Array.from(document.querySelectorAll(".photo-link"));

  if (!canvas || !traceCanvas || !copy || !headline || !biography || !portraitFrame) return;

  const context = canvas.getContext("2d", { alpha: false });
  const traceContext = traceCanvas.getContext("2d");
  const coarseGridSize = 64;
  const refinement = 4;
  const sampleGridSize = coarseGridSize * refinement;
  const coarseCellSize = canvas.width / coarseGridSize;
  const totalCells = coarseGridSize * coarseGridSize;
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#f3f0e7";
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#17201a";
  const tracerColors = ["#405448", "#66616b", "#63534d", "#4c5863"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const source = new Image();

  let searchPaths = [];
  let luminance = null;
  let sourceCrop = null;
  let animationRun = 0;
  let fitRequest = 0;

  const fitCopyToPortrait = () => {
    headline.style.fontSize = "";
    biography.style.fontSize = "";

    if (window.matchMedia("(max-width: 520px)").matches) return;

    const targetHeight = portraitFrame.getBoundingClientRect().height;
    const biographyBase = Number.parseFloat(getComputedStyle(biography).fontSize);

    if (!targetHeight || !biographyBase) return;

    let lowerScale = 0.6;
    let upperScale = 2;
    let bestScale = 1;
    let bestDifference = Infinity;

    const applyScale = (scale) => {
      biography.style.fontSize = `${biographyBase * scale}px`;
    };

    for (let iteration = 0; iteration < 12; iteration += 1) {
      const scale = (lowerScale + upperScale) / 2;
      applyScale(scale);

      const difference = copy.getBoundingClientRect().height - targetHeight;

      if (Math.abs(difference) < bestDifference) {
        bestDifference = Math.abs(difference);
        bestScale = scale;
      }

      if (difference < 0) lowerScale = scale;
      else upperScale = scale;
    }

    applyScale(bestScale);
  };

  const scheduleCopyFit = () => {
    cancelAnimationFrame(fitRequest);
    fitRequest = requestAnimationFrame(fitCopyToPortrait);
  };

  const indexFor = (x, y) => y * coarseGridSize + x;

  const darknessAt = (index) => {
    if (!luminance) return 0;

    const cellX = index % coarseGridSize;
    const cellY = Math.floor(index / coarseGridSize);
    let total = 0;

    for (let y = 0; y < refinement; y += 1) {
      for (let x = 0; x < refinement; x += 1) {
        const sampleX = cellX * refinement + x;
        const sampleY = cellY * refinement + y;
        total += luminance[sampleY * sampleGridSize + sampleX];
      }
    }

    const lightness = total / (refinement * refinement * 255);
    return Math.max(0, Math.min(1, (0.94 - lightness) / 0.94));
  };

  const buildSearchPath = ({ minX, maxX, minY, maxY, startX, startY, localBias = false, adaLead = false }) => {
    const path = [];
    const visited = new Uint8Array(totalCells);
    const stack = [];

    const neighborsOf = (index) => {
      const x = index % coarseGridSize;
      const y = Math.floor(index / coarseGridSize);
      const neighbors = [];

      if (x > minX) neighbors.push(index - 1);
      if (x < maxX) neighbors.push(index + 1);
      if (y > minY && x > minX) neighbors.push(index - coarseGridSize - 1);
      if (y > minY && x < maxX) neighbors.push(index - coarseGridSize + 1);
      if (y < maxY && x > minX) neighbors.push(index + coarseGridSize - 1);
      if (y < maxY && x < maxX) neighbors.push(index + coarseGridSize + 1);

      return neighbors;
    };

    const start = indexFor(startX, startY);
    visited[start] = 1;
    stack.push(start);
    path.push(start);

    while (stack.length) {
      const current = stack[stack.length - 1];
      const available = neighborsOf(current).filter((index) => !visited[index]);

      if (available.length) {
        let candidates = available;
        const currentDarkness = darknessAt(current);

        if (adaLead) {
          const bestNearbyFitness = Math.max(...available.map(darknessAt));
          candidates = available.filter((index) => darknessAt(index) >= bestNearbyFitness - 0.06);
        } else if (localBias && currentDarkness > 0.18) {
          const nearbyLargeDots = available.filter((index) => darknessAt(index) > 0.11);
          if (nearbyLargeDots.length) candidates = nearbyLargeDots;
        }

        const weights = candidates.map((index) => (
          adaLead
            ? 1 + darknessAt(index) * 64
            : localBias && currentDarkness > 0.18
            ? 1 + darknessAt(index) * 28
            : 1
        ));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let choice = Math.random() * totalWeight;
        let next = candidates[candidates.length - 1];

        for (let index = 0; index < candidates.length; index += 1) {
          choice -= weights[index];
          if (choice <= 0) {
            next = candidates[index];
            break;
          }
        }

        visited[next] = 1;
        stack.push(next);
        path.push(next);
      } else {
        stack.pop();
        if (stack.length) path.push(stack[stack.length - 1]);
      }
    }

    return path;
  };

  const buildSearchPaths = () => {
    return [
      buildSearchPath({ minX: 0, maxX: coarseGridSize - 1, minY: 0, maxY: coarseGridSize - 1, startX: 0, startY: 0, localBias: true }),
      buildSearchPath({ minX: 0, maxX: coarseGridSize - 1, minY: 0, maxY: coarseGridSize - 1, startX: coarseGridSize - 1, startY: 0, adaLead: true }),
      buildSearchPath({ minX: 0, maxX: coarseGridSize - 1, minY: 0, maxY: coarseGridSize - 1, startX: 0, startY: coarseGridSize - 1, localBias: true }),
      buildSearchPath({ minX: 0, maxX: coarseGridSize - 1, minY: 0, maxY: coarseGridSize - 1, startX: coarseGridSize - 1, startY: coarseGridSize - 1 }),
    ];
  };

  const prepareSource = () => {
    const side = Math.min(source.naturalWidth, source.naturalHeight);
    sourceCrop = {
      side,
      x: (source.naturalWidth - side) / 2,
      y: (source.naturalHeight - side) / 2,
    };

    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    sampleCanvas.width = sampleGridSize;
    sampleCanvas.height = sampleGridSize;
    sampleContext.drawImage(
      source,
      sourceCrop.x,
      sourceCrop.y,
      sourceCrop.side,
      sourceCrop.side,
      0,
      0,
      sampleGridSize,
      sampleGridSize,
    );

    try {
      const pixels = sampleContext.getImageData(0, 0, sampleGridSize, sampleGridSize).data;
      luminance = new Float32Array(sampleGridSize * sampleGridSize);

      for (let index = 0; index < luminance.length; index += 1) {
        const offset = index * 4;
        luminance[index] = pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
      }
    } catch {
      luminance = null;
    }
  };

  const averageLuminance = (startX, startY, span) => {
    let total = 0;

    for (let y = 0; y < span; y += 1) {
      for (let x = 0; x < span; x += 1) {
        total += luminance[(startY + y) * sampleGridSize + startX + x];
      }
    }

    return total / (span * span);
  };

  const drawFallbackDots = (cellX, cellY, subdivisions) => {
    const subCellSize = coarseCellSize / subdivisions;
    const sampleSpan = refinement / subdivisions;
    const sourceUnit = sourceCrop.side / sampleGridSize;

    for (let y = 0; y < subdivisions; y += 1) {
      for (let x = 0; x < subdivisions; x += 1) {
        const destinationX = cellX * coarseCellSize + x * subCellSize;
        const destinationY = cellY * coarseCellSize + y * subCellSize;
        const sampleX = cellX * refinement + x * sampleSpan;
        const sampleY = cellY * refinement + y * sampleSpan;

        context.save();
        context.beginPath();
        context.arc(
          destinationX + subCellSize / 2,
          destinationY + subCellSize / 2,
          subCellSize * 0.44,
          0,
          Math.PI * 2,
        );
        context.clip();
        context.drawImage(
          source,
          sourceCrop.x + sampleX * sourceUnit,
          sourceCrop.y + sampleY * sourceUnit,
          sampleSpan * sourceUnit,
          sampleSpan * sourceUnit,
          destinationX,
          destinationY,
          subCellSize,
          subCellSize,
        );
        context.restore();
      }
    }
  };

  const drawHalftoneCell = (index, subdivisions) => {
    const cellX = index % coarseGridSize;
    const cellY = Math.floor(index / coarseGridSize);
    const destinationX = cellX * coarseCellSize;
    const destinationY = cellY * coarseCellSize;
    const subCellSize = coarseCellSize / subdivisions;
    const sampleSpan = refinement / subdivisions;

    context.fillStyle = paper;
    context.fillRect(destinationX, destinationY, coarseCellSize + 0.5, coarseCellSize + 0.5);

    if (!luminance) {
      drawFallbackDots(cellX, cellY, subdivisions);
      return;
    }

    context.fillStyle = ink;

    for (let y = 0; y < subdivisions; y += 1) {
      for (let x = 0; x < subdivisions; x += 1) {
        const sampleX = cellX * refinement + x * sampleSpan;
        const sampleY = cellY * refinement + y * sampleSpan;
        const lightness = averageLuminance(sampleX, sampleY, sampleSpan) / 255;
        const darkness = Math.max(0, Math.min(1, (0.94 - lightness) / 0.94));
        const radius = subCellSize * 0.48 * Math.pow(darkness, 0.68);

        if (radius < 0.25) continue;

        context.beginPath();
        context.arc(
          destinationX + (x + 0.5) * subCellSize,
          destinationY + (y + 0.5) * subCellSize,
          radius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
  };

  const drawCursor = (index, subdivisions, color) => {
    const x = index % coarseGridSize;
    const y = Math.floor(index / coarseGridSize);
    const centerX = (x + 0.5) * coarseCellSize;
    const centerY = (y + 0.5) * coarseCellSize;

    traceContext.beginPath();
    traceContext.arc(centerX, centerY, coarseCellSize * 0.34, 0, Math.PI * 2);
    traceContext.strokeStyle = color;
    traceContext.lineWidth = 1.5;
    traceContext.globalAlpha = 0.55;
    traceContext.stroke();
    traceContext.globalAlpha = 1;
  };

  const fadeTrace = () => {
    traceContext.globalCompositeOperation = "destination-out";
    traceContext.fillStyle = "rgba(0, 0, 0, 0.009)";
    traceContext.fillRect(0, 0, traceCanvas.width, traceCanvas.height);
    traceContext.globalCompositeOperation = "source-over";
  };

  const drawTrace = (fromIndex, toIndex, color) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const fromX = (fromIndex % coarseGridSize + 0.5) * coarseCellSize;
    const fromY = (Math.floor(fromIndex / coarseGridSize) + 0.5) * coarseCellSize;
    const toX = (toIndex % coarseGridSize + 0.5) * coarseCellSize;
    const toY = (Math.floor(toIndex / coarseGridSize) + 0.5) * coarseCellSize;

    traceContext.beginPath();
    traceContext.moveTo(fromX, fromY);
    traceContext.lineTo(toX, toY);
    traceContext.strokeStyle = color;
    traceContext.lineWidth = 1.25;
    traceContext.lineCap = "round";
    traceContext.stroke();
  };

  const revealAll = () => {
    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < totalCells; index += 1) {
      drawHalftoneCell(index, refinement);
    }
  };

  const play = () => {
    animationRun += 1;
    const currentRun = animationRun;
    searchPaths = buildSearchPaths();
    photoLinks.forEach((link) => {
      link.classList.remove("is-revealed");
      link.setAttribute("tabindex", "-1");
    });

    const revealLinkAt = (index) => {
      const x = index % coarseGridSize;
      const y = Math.floor(index / coarseGridSize);

      photoLinks.forEach((link) => {
        if (link.classList.contains("is-revealed")) return;

        const targetX = Math.round(Number.parseFloat(link.dataset.searchX) * (coarseGridSize - 1));
        const targetY = Math.round(Number.parseFloat(link.dataset.searchY) * (coarseGridSize - 1));

        if (x !== targetX || y !== targetY) return;

        link.classList.add("is-revealed");
        link.removeAttribute("tabindex");
      });
    };

    if (reducedMotion.matches) {
      photoLinks.forEach((link) => {
        link.classList.add("is-revealed");
        link.removeAttribute("tabindex");
      });
      revealAll();
      return;
    }

    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    traceContext.clearRect(0, 0, traceCanvas.width, traceCanvas.height);

    const phaseLength = searchPaths[0].length;
    const totalSteps = phaseLength * 3;
    const duration = 1200000;
    const start = performance.now();
    let pathPosition = 0;
    const activePixels = new Array(searchPaths.length).fill(-1);
    const activeSubdivisions = new Array(searchPaths.length).fill(1);
    const pendingDots = [];

    const queueDot = (index, subdivisions, now) => {
      pendingDots.push({ index, subdivisions, revealAt: now + 300 });
    };

    const revealPendingDots = (now) => {
      while (pendingDots.length && pendingDots[0].revealAt <= now) {
        const pending = pendingDots.shift();
        drawHalftoneCell(pending.index, pending.subdivisions);
      }
    };

    const frame = (now) => {
      if (currentRun !== animationRun) return;
      fadeTrace();
      revealPendingDots(now);

      const target = Math.min(
        totalSteps,
        Math.max(1, Math.floor(((now - start) / duration) * totalSteps)),
      );

      while (pathPosition < target) {
        const phase = Math.min(2, Math.floor(pathPosition / phaseLength));
        const phasePosition = pathPosition % phaseLength;
        const reversed = phase === 1;
        const sourcePosition = reversed ? phaseLength - phasePosition - 1 : phasePosition;

        searchPaths.forEach((searchPath, tracerIndex) => {
          if (activePixels[tracerIndex] >= 0) {
            queueDot(activePixels[tracerIndex], activeSubdivisions[tracerIndex], now);
          }

          const previousPixel = activePixels[tracerIndex];
          activePixels[tracerIndex] = searchPath[sourcePosition];
          activeSubdivisions[tracerIndex] = 2 ** phase;
          drawTrace(previousPixel, activePixels[tracerIndex], tracerColors[tracerIndex]);
          revealLinkAt(activePixels[tracerIndex]);
        });

        pathPosition += 1;
      }

      if (pathPosition < totalSteps) {
        activePixels.forEach((activePixel, tracerIndex) => {
          drawCursor(activePixel, activeSubdivisions[tracerIndex], tracerColors[tracerIndex]);
        });
        requestAnimationFrame(frame);
      } else if (activePixels.some((activePixel) => activePixel >= 0)) {
        activePixels.forEach((activePixel, tracerIndex) => {
          if (activePixel >= 0) queueDot(activePixel, activeSubdivisions[tracerIndex], now);
          activePixels[tracerIndex] = -1;
        });
        requestAnimationFrame(frame);
      } else if (pendingDots.length) {
        requestAnimationFrame(frame);
      } else {
        const fadeStarted = performance.now();

        const fadeTail = (fadeNow) => {
          if (currentRun !== animationRun) return;
          fadeTrace();
          if (fadeNow - fadeStarted < 5000) requestAnimationFrame(fadeTail);
        };

        requestAnimationFrame(fadeTail);
      }
    };

    requestAnimationFrame(frame);
  };

  source.addEventListener("load", () => {
    prepareSource();
    scheduleCopyFit();
    play();
  });

  source.addEventListener("error", () => {
    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
  });

  source.src = canvas.dataset.source;
  window.addEventListener("resize", scheduleCopyFit);
  document.fonts?.ready.then(scheduleCopyFit);
})();
