/** Defines the bundled portraits, clues and unambiguous distractors. */
export const looks = [
  {
    name: "Ginger",
    photos: ["ginger.jpg", "ginger-2.jpg"],
    clue: "Look for a warm orange coat, like marmalade.",
    distractors: ["Calico", "Tortoiseshell", "Solid grey", "Tuxedo"],
  },
  {
    name: "Calico",
    photos: ["calico.jpg", "calico-2.jpg"],
    clue: "Look for distinct patches of white, orange and black.",
    distractors: ["Ginger", "Striped tabby", "Solid white", "Dilute calico"],
  },
  {
    name: "Tortoiseshell",
    photos: ["tortoiseshell.jpg", "tortoiseshell-2.jpg"],
    clue: "Look for black and orange fur mingled together.",
    distractors: ["Tuxedo", "Calico", "Solid black", "Striped tabby"],
  },
  {
    name: "Tuxedo",
    photos: ["tuxedo.jpg", "tuxedo-2.jpg"],
    clue: "Its black coat and white bib look like formal clothes.",
    distractors: ["Solid black", "Solid white", "Calico", "Tortoiseshell"],
  },
  {
    name: "Siamese",
    photos: ["siamese.jpg", "siamese-2.jpg"],
    clue: "Its ears, face and paws are darker than its pale body.",
    distractors: ["Tuxedo", "Solid white", "Solid grey", "Calico"],
  },
  {
    name: "Striped tabby",
    photos: ["tabby.jpg", "tabby-2.jpg"],
    clue: "Look for narrow stripes down its sides.",
    distractors: [
      "Spotted tabby",
      "Swirled tabby",
      "Solid grey",
      "Tortoiseshell",
    ],
  },
  {
    name: "Solid black",
    photos: ["black.jpg", "black-2.jpg"],
    clue: "Look for an all-black coat.",
    distractors: ["Tuxedo", "Tortoiseshell", "Solid grey", "Solid white"],
  },
  {
    name: "Solid white",
    photos: ["white.jpg", "white-2.jpg"],
    clue: "Its fur is white all over.",
    distractors: ["Siamese", "Solid grey", "Dilute calico", "Tuxedo"],
  },
  {
    name: "Solid grey",
    photos: ["grey.jpg"],
    clue: "Look for an even slate-grey coat.",
    distractors: ["Solid black", "Solid white", "Siamese", "Striped tabby"],
  },
  {
    name: "Dilute calico",
    photos: ["dilute-calico.jpg"],
    clue: "Look for soft grey and pale cream patches on white fur.",
    distractors: ["Solid white", "Solid grey", "Tuxedo", "Siamese"],
  },
  {
    name: "Spotted tabby",
    photos: ["spotted-tabby.jpg"],
    clue: "Look for rows of dark spots along its sides.",
    distractors: [
      "Striped tabby",
      "Swirled tabby",
      "Solid grey",
      "Tortoiseshell",
    ],
  },
  {
    name: "Swirled tabby",
    photos: ["swirled-tabby.jpg"],
    clue: "Look for broad swirls on its sides, like a bullseye.",
    distractors: [
      "Striped tabby",
      "Spotted tabby",
      "Solid grey",
      "Tortoiseshell",
    ],
  },
];
