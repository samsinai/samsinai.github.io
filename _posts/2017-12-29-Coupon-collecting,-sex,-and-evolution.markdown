---
layout: post
title:  "Coupon collecting, sex, and evolution"
date:   2018-03-29 17:59:35 -0400
author: This work was done in collaboration with Jason Olejarz, Iulia Neagu and Martin Nowak.
categories: jekyll update
---

<script type="text/x-mathjax-config">
        MathJax.Hub.Config({
            tex2jax: {
              skipTags: ['script', 'noscript', 'style', 'textarea', 'pre']
            }
          });

        MathJax.Hub.Queue(function() {
            var all = MathJax.Hub.getAllJax(), i;
            for(i=0; i < all.length; i += 1) {
                all[i].SourceElement().parentNode.className += ' has-jax';
            }
        });

</script>

<script type="text/javascript"
        src="https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>
<script
  type="text/javascript"
  charset="utf-8"
  src="https://vincenttam.github.io/javascripts/MathJaxLocal.js"></script>

## The Math Puzzle

A well known problem in probability is the so called [“ coupon collector’s” problem](https://en.wikipedia.org/wiki/Coupon_collector%27s_problem). It goes as follows: imagine there are N unique types of coupons and you are trying to collect all of them. Each day you get to pick up a single coupon without knowing its type. The coupon you pick up may be new, or it may be of the type that you already have. The question of interest is how many days does it take for you to collect all N coupons. In the classical case, often a question in probability courses, the answer is simple to calculate:

$$E(T)= n. H_n \approx n \log n $$

Now consider the following twist, what if, you were allowed to pick up more than one coupon per day, each with independent probability p. Let’s call this variant the “album collector’s problem”.  Each day you collect an album with some coupons in it, and add those that are new to your collection. How many days would it take for you to pick up all of the coupons? 

Letting $$q=1-p$$, the answer is expressed as  

$$\sum_{i=1}^n {n \choose i}\frac{(-1)^{i}}{1-q^{-i}} \approx log_q (n)$$


Its easy to see that if $$p > 1/n$$ , it will take less time to collect the coupons as compared to the “once a day” routine. 

This is well known in the CS community (where it's used for Radix sort and skip lists [1]) and in fact some famous geneticists[2] wrote a paper about how it relates to evolutionary search processes on simple fitness ladnscapes. 

In our recent work, [published](http://rsif.royalsocietypublishing.org/content/15/139/20180003) in the Journal of The Royal Society Interface we add an additional twist to this problem (read the freely accessible preprint [here](https://arxiv.org/abs/1612.00825)). What if, every night, there was a possibility that a "friend" would steal your album with everything you collected so far?

If this probability $$\delta$$ was very high, e.g. it was certain ($$\delta=1$$) that you lost everything every night, in order to have a full album you need exponentially many days to collect all coupons at once. This is because an independent sampling of coupons gives a $$(1/p)^n$$ chance that you will hit all coupons together. But if the friends stealing habits were more sporadic, you might not be in a disastrous shape. 

Given p and $$\delta$$,we compute the expression for this case exactly (see the article for the details). A harder task is to be able to compare this formula with the best case scenario that you never lose your album ($$\delta=0$$), and the worst case scenario that you lose everything every night.

With a bunch of approximation tricks (thanks Jason) we manage to boil this problem down to a functional form that can be intuitively compared with our boundary cases.

$$E(T) \approx \frac{1}{\delta}n^{(\delta/p)}$$

This quantifies the trade-off for collecting coupons between p and $$\delta$$. What is clear is, given a fixed $$\delta$$, we are no longer in the exponential regime.

## The Biology

Why is this interesting? This is not just a probability puzzle. As mentioned before there are collection processes that are simular to this in biology. Of particular interest to me, and what inspired this calculation, is the process known as multiplicity reactivation (MR). In this process, functionally deficient viruses co-infect cells, and "cover" each other's deficiencies, which allows them to generate fully functional virions and infect new cells. A lot of viral innovation through reassortment also follows this type of collection. Some Timoviruses are obligate cooperators, meaning they require other virions to co-infect with them to function. Of course, $$n$$ there is usually small enough that these calculations don't really save you from disasters, they simply don't occur.

There are three reasons I find this line of investingation fascinating.

1. (Origin of life) An "auto-catalytic set" is a commonly invoked concept in the origin of life. Most people consider the starting core of this set to be necessarily small due to probabilistic arguments of co-occurence. Because protocells can merge, we argue that the small core is not necessarily a restriction. Cells could have accumulated a large set of functions, in relatively quick manner, even if parasites, division, or death would set them back during the process. 

2. (Viral sex) This computation gives hints towards what could have been possible in the viral world. Huge gene transfer and trying new combinations (like MR) could have been going on all the time. Some phages save their photosynthetic hosts by introducing necessary genes into them. I think given the efficiency of this process, it might give a bit more credit to the "virus first" picture, a hypothesis on the origins of viruses that is currently disfavored (for many good reasons, the "escape hypothesis" is dominant, but it is not mutually exclusive with virus first). The speculative idea here is that viruses with different simple capabilities might have been sexually mixing in their rather empty or dysfunctional protocells, and eventually, helped fully independent reproductive cells emerged. I.e. ancient protocells exchanged modules through virus like entities, and generated an auto-catalytic network. 

3. (Fitness landscapes) Per Wilf and Ewens[2], this type of thinking can be extended to fitness landscapes. In their work, they consider a smooth Mt. Fuji landscape with a global peak. Their model is exactly like ours, except they only consider the case that $$\delta=0$$. Our work helps us quantify how in non-smooth landscapes (deaths represents unviable valleys or swamplands, or suboptimal local peaks) , the global peak may be found nonetheless, given a certain amount of local peaks and dead ends.

For a less speculative, more detailed treatment of these ideas, read the [main paper](). Comments, ideas to extend our work, and feedback is welcome. 

## Note

Artem Kaznatcheev has written a great blog post on this work as well, with a slightly different lens, check it out [here](https://egtheory.wordpress.com/2016/12/18/fusion-and-sex/). 

## References

[1]Pugh W. 1990 Skip lists: a probabilistic alternative to balanced trees. Commun. ACM 33, 668 – 676. (doi:10.1145/78973.78977)

[2]Wilf HS, Ewens WJ. 2010 There’s plenty of time for evolution. Proc. Natl Acad. Sci. USA 107



