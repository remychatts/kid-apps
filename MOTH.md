# Moth game

## Introduction

This spec is for an "interactive experience" (calling it a "game" is currently a bit of a stretch, since it's lacking a bit in genuine gameplay fun) intended to introduce the basics of genetics, evolution, and a bit of stats/probability, to ~10 year old kids who are encountering this mostly for the first time. It's structured around the example of the peppered moth and industrial melanism.

In practical terms, the final artefact is a web app, suitable for serving from a static web server, optimised for iPad landscape mode. A rendering system for moths as animated SVGs is in apps/moth-studio, along with a throwaway demo app to inspect the result. The moth rendering includes a random range of cosmetic attributes (eye size, body length, etc) as well as some basic animations, but these are purely to create a more engaging experience. The one scientifically meaningful setting is light or dark (typica vs carbonaria).

In earlier chapters, moths are shown with a "genotype" of two circles, each of which is either light or dark. In later chapters, the moths can take on a continuous phenotype from 0 (fully dark) to 1 (fully light). The code for either variant should be copied within the new apps/moth repo, using apps/moth-studio only as x  source material.

## Scientific scope

In the early chapters, we model the moths as diploid single-gene organisms that reproduce sexually once per year, and live for up to one year. The single gene has just two variants (typica/carbonaria) - eg we ignore insularia - and the dark allele is dominant over the light one. There is a small chance of spontaneous changes to a gene.

(In later chapters, we change to a different, continuous phenotype model - see below.)

We want to convey, via progressive disclosure, and without all the complicated words:

 - the basic idea of a genotype vs phenotype
 - the basics of how diploid genes get mixed in sexual reproduction (no crossover)
 - dominant vs recessive alleles
 - how variation + selection pressure causes observable phenotype changes in a population

(Parenthetical question: where are we "lying" to the student here? If we ignore all the other genes involved in eg insularia, I think this is all somewhat close to the truth, right? eg They are diploid, they reproduce sexually, the typica/carbonaria phenotype comes from a single locus switch on *cortex* with dominance of the dark allele, at least in the UK they lay one set of eggs per year, etc?)

## Structure

We assume there is a human instructor guiding the student, so it's not necessary to spell everything out in words. Rather, the goal of the app is to present engaging visuals and interactions, to support the teaching narrative.

The structure of the app is a few chapters, leading up to the explanation of industrial melanism and evolution. The default flow is to walk through from start to finish, but the student and/or teacher is free to jump between chapters as they wish.

### Chapter 1: genotype vs phenotype

Introduce the basic unit of the app: a moth, with two alleles, represented as a pair of circles that are either white or black. Throughout the whole app, each moth is gently animated and has randomised cosmetic attributes.

First show the four possibilities (with 3 dark moths and one light one). Then introduce a short quiz, where pairs of alleles are shown, and the student has to select the right option as to whether the phenotype is light or dark (so light/light genotype => light phenotype, all others => dark phenotype).

"Allele" is too complex a term to introduce, so never use the word in the UI. Instead, refer to the pair of circles as "genes" for simplicity, and the phenotype as "appearance".

### Chapter 2: reproduction

Introduce the basics of how genes work diploid sexual reproduction, ignoring many details around meiosis, crossover, the caterpillar/pupa stages, etc.

Show a moth, labelled "Mum", as usual with her "genotype" (two circles, either white or black). Animate each of these two circles going into four eggs below her (two of each). Then show a "Dad" moth, an animate his circles going into four sperm below him (two of each). Then choose a random pairing of the 4 eggs with the 4 sperm, with arrows, and animate a copy of the egg/sperm single circles into four diploid pairs. Then develop those four pairs into four new moths, with appropriate phenotype.

To get more interaction, let the student choose their own pairing of individual egg with sperm, along with a "finish randomly" button that completes the pairing randomly. They can also choose their own genotype of the parents, rather than just get a random selection, and restart the process as many times as they wish.

It's obviously unrealistic for one pair of moths to produce 4 offspring (rather than hundreds or thousands of eggs) but we're going for concepts here.

### Chapter 3: evolution

Very high level idea: we model an ongoing population of 4 moths. Each year, each pair of moths (we just assume one is male and one is female) produce 4 offspring each, half of which get lost to predators.

We start with a mixture of light/dark phenotypes, and ensure we maintain at least one light and dark allele in the population at every stage.

The student picks the background (light or dark). The moths have their offspring. Then we model birds coming in and eating half the moths. The ones that stand out from the background are more likely to be eaten. Ideally we would like a little animation of birds swooping in and taking away half the moths. Cute, not gruesome.

The student should be able to see that over a few years, the population's phenotype shifts towards the background colour.

We can then flip to the other colour, and the same starting conditions, and see the population phenotype shift accordingly.

### Chapter 4: "speciation"

Give a basic conceptual basis for how bigger changes like speciation can occur. So a first answer to questions like "when was the first human born".

For this, we deviate from the simple typica/carbonaria model used so far, and instead consider an unspecified complex of genes, giving a continuous phenotype labelled from 0.0 (maximally dark) to 1.0 (maximally light). We don't depict the genes at all, just the phenotype. Offspring get their (single) phenotype number by sampling from a normal distribution, whose centre is the average of the two parental values, and whose standard deviation is a tunable constant in the simulation (indicating speed of genetic drift). Samples are bounded to [0, 1].

The idea here is similar to chapter 3, but more fine-grained. The student controls the
"bark" colour. The first few years/generations go slowly, so they get the idea, but then they can speed it up, and see the population phenotype change. In this version, we are not fixed at 4 living moths per year: if the student shifts the bark colour too quickly, then the entire population can die out. On the other hand, the population is very well adapted, it can grow bigger (maybe up to 8 moths per year?). The goal is that the student can get a visceral appreciation for how all the individual mechanics established so far combine, so that we can go from a basically-all-white population to a basically-all-black population (as a simple proxy for speciation) in gradual non-planned mechanical steps.
