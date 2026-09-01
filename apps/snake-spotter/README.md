# Snake Spotter

An iPad-first visual identification game featuring 20 photographed snake species, a wider pool of 100 possible answers and kid-friendly fact sheets.

Players identify ten non-repeating snakes per expedition. A correct photo-only answer earns two points; revealing the facts first reduces the available reward to one point. The ten best scores are stored only in the browser's local storage.

Run it from the repository root:

```sh
npm run dev -- snake-spotter
```

The app is installable and fully playable offline after its first successful load.

## Photo sources

The gameplay photos are square crops of files from Wikimedia Commons. Attribution is kept here so it does not interrupt the quiz.

| Species                         | Photograph                                                                                                                                                   | Licence       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Ball python                     | [HCA](https://commons.wikimedia.org/wiki/File:Ball_python_lucy.JPG)                                                                                          | CC BY-SA 3.0  |
| Boa constrictor                 | [Charles J. Sharp](<https://commons.wikimedia.org/wiki/File:Red-tailed_boa_(Boa_constrictor_constrictor)_Rio_Napo.jpg>)                                      | CC BY-SA 4.0  |
| Burmese python                  | [Shadow Ayush](https://commons.wikimedia.org/wiki/File:Burmese_Python_photographed_at_Bardiya_National_Park2.jpg)                                            | CC BY-SA 4.0  |
| Reticulated python              | [Mariluna](https://commons.wikimedia.org/wiki/File:Python_reticulatus_%D1%81%D0%B5%D1%82%D1%87%D0%B0%D1%82%D1%8B%D0%B9_%D0%BF%D0%B8%D1%82%D0%BE%D0%BD-2.jpg) | CC BY-SA 3.0  |
| King cobra                      | [Michael Allen Smith](https://commons.wikimedia.org/wiki/File:12_-_The_Mystical_King_Cobra_and_Coffee_Forests.jpg)                                           | CC BY-SA 2.0  |
| Indian cobra                    | [Pavan Kumar N](https://commons.wikimedia.org/wiki/File:Indian_Cobra,_crop.jpg)                                                                              | CC BY-SA 3.0  |
| Black mamba                     | [TimVickers](<https://commons.wikimedia.org/wiki/File:Dendroaspis_polylepis_(14).jpg>)                                                                       | Public domain |
| Green anaconda                  | [MKAMPIS](https://commons.wikimedia.org/wiki/File:Sucuri_verde.jpg)                                                                                          | CC BY-SA 4.0  |
| Corn snake                      | [Ethan Porcaro](https://commons.wikimedia.org/wiki/File:CornSnake.jpg)                                                                                       | CC0           |
| Milk snake                      | [Will Brown](<https://commons.wikimedia.org/wiki/File:Eastern_Milk_Snake_(Lampropeltis_triangulum_triangulum)_(27916193197).jpg>)                            | CC BY 2.0     |
| Western diamondback rattlesnake | [Holger Krisp](<https://commons.wikimedia.org/wiki/File:(Westliche_Diamantklapperschlange)_Crotalus_atrox.jpg>)                                              | CC BY 3.0     |
| Eastern coral snake             | [John](https://commons.wikimedia.org/wiki/File:EASTERN_CORAL_SNAKE.jpg)                                                                                      | CC BY 2.0     |
| Gaboon viper                    | [Marius Burger](https://commons.wikimedia.org/wiki/File:Bitis_gabonica.jpg)                                                                                  | CC0           |
| Puff adder                      | [Danny S.](https://commons.wikimedia.org/wiki/File:Bitis_arietans_by_Danny_S._1.JPG)                                                                         | CC BY-SA 4.0  |
| Inland taipan                   | [XLerate](https://commons.wikimedia.org/wiki/File:Fierce_Snake-Oxyuranus_microlepidotus.jpg)                                                                 | CC BY-SA 3.0  |
| Boomslang                       | [Miguel da Fonseca](https://commons.wikimedia.org/wiki/File:Dispholidus_typus_333317716.jpg)                                                                 | CC0           |
| Emerald tree boa                | [Edeag3](https://commons.wikimedia.org/wiki/File:Emerald_Tree_Boa_Head.jpg)                                                                                  | CC BY-SA 4.0  |
| California kingsnake            | [Connor Long](<https://commons.wikimedia.org/wiki/File:California_Kingsnake_(Lampropeltis_getula_californiae).JPG>)                                          | CC BY-SA 4.0  |
| Common garter snake             | [Wilson44691](https://commons.wikimedia.org/wiki/File:Thamnophis_sirtalis_sirtalis_Wooster.jpg)                                                              | Public domain |
| Eastern hognose snake           | [Peter Paplanus](<https://commons.wikimedia.org/wiki/File:Eastern_Hognose_Snake_(Heterodon_platirhinos)_(17130316660).jpg>)                                  | CC BY 2.0     |
