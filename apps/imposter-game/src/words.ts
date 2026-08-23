/**
 * Family-friendly secret words and broad clues used by the game.
 * Secret words may contain at most 11 letters, excluding spaces, so they fit narrow screens.
 */
export type WordCard = {
  word: string;
  category: string;
  clues: readonly [string, string, string, ...string[]];
};

export const WORDS: readonly WordCard[] = [
  {
    word: "PENGUIN",
    category: "Animals",
    clues: ["Cold climate", "Waddles", "Black and white"],
  },
  {
    word: "GIRAFFE",
    category: "Animals",
    clues: ["Very tall", "Spotted", "Long neck"],
  },
  {
    word: "DOLPHIN",
    category: "Animals",
    clues: ["Ocean", "Intelligent", "Playful"],
  },
  {
    word: "HEDGEHOG",
    category: "Animals",
    clues: ["Garden visitor", "Nocturnal", "Spiky"],
  },
  {
    word: "FLAMINGO",
    category: "Animals",
    clues: ["Tropical", "One leg", "Colourful"],
  },
  {
    word: "PIZZA",
    category: "Food",
    clues: ["Italian", "Oven-baked", "Toppings"],
  },
  {
    word: "POPCORN",
    category: "Food",
    clues: ["Cinema", "Snack", "Salty or sweet"],
  },
  {
    word: "PANCAKE",
    category: "Food",
    clues: ["Breakfast", "Flat", "Flipped"],
  },
  {
    word: "SUSHI",
    category: "Food",
    clues: ["Japanese", "Bite-sized", "Rice"],
  },
  {
    word: "WATERMELON",
    category: "Food",
    clues: ["Summer", "Juicy", "Seeds"],
  },
  {
    word: "LIGHTHOUSE",
    category: "Places",
    clues: ["Coast", "Warning", "Beam"],
  },
  {
    word: "CASTLE",
    category: "Places",
    clues: ["Historic", "Stone", "Royal"],
  },
  {
    word: "AIRPORT",
    category: "Places",
    clues: ["Travel", "Security", "Departures"],
  },
  {
    word: "LIBRARY",
    category: "Places",
    clues: ["Quiet", "Shelves", "Borrowing"],
  },
  {
    word: "VOLCANO",
    category: "Places",
    clues: ["Mountain", "Hot", "Eruption"],
  },
  {
    word: "UMBRELLA",
    category: "Objects",
    clues: ["Weather", "Folds", "Canopy"],
  },
  {
    word: "TELESCOPE",
    category: "Objects",
    clues: ["Night-time", "Lens", "Astronomy"],
  },
  {
    word: "BACKPACK",
    category: "Objects",
    clues: ["Travel", "Straps", "Storage"],
  },
  {
    word: "TOOTHBRUSH",
    category: "Objects",
    clues: ["Bathroom", "Bristles", "Clean"],
  },
  {
    word: "COMPASS",
    category: "Objects",
    clues: ["Navigation", "Needle", "Direction"],
  },
  {
    word: "ZIP LINE",
    category: "Activities",
    clues: ["Fast", "Height", "Harness"],
  },
  {
    word: "KARAOKE",
    category: "Activities",
    clues: ["Music", "Microphone", "Lyrics"],
  },
  {
    word: "CAMPING",
    category: "Activities",
    clues: ["Outdoors", "Fire", "Tent"],
  },
  {
    word: "BOWLING",
    category: "Activities",
    clues: ["Lane", "Pins", "Rolling"],
  },
  {
    word: "BAKING",
    category: "Activities",
    clues: ["Kitchen", "Recipe", "Heat"],
  },
  {
    word: "RAINBOW",
    category: "Nature",
    clues: ["After rain", "Arc", "Colourful"],
  },
  {
    word: "THUNDER",
    category: "Nature",
    clues: ["Storm", "Follows a flash", "Rumble"],
  },
  {
    word: "WATERFALL",
    category: "Nature",
    clues: ["Fresh water", "Drop", "Loud"],
  },
  {
    word: "CACTUS",
    category: "Nature",
    clues: ["Dry climate", "Stores water", "Prickly"],
  },
  {
    word: "SNOWFLAKE",
    category: "Nature",
    clues: ["Winter", "Unique", "Frozen"],
  },
  {
    word: "ROBOT",
    category: "Technology",
    clues: ["Machine", "Programmed", "Automatic"],
  },
  {
    word: "HEADPHONES",
    category: "Technology",
    clues: ["Audio", "Worn", "Pair"],
  },
  {
    word: "CAMERA",
    category: "Technology",
    clues: ["Lens", "Focus", "Flash"],
  },
  {
    word: "KEYBOARD",
    category: "Technology",
    clues: ["Computer", "Letters", "Typing"],
  },
  {
    word: "SATELLITE",
    category: "Technology",
    clues: ["Orbit", "Signal", "Communication"],
  },
  {
    word: "WIZARD",
    category: "Characters",
    clues: ["Fantasy", "Robes", "Magic"],
  },
  {
    word: "PIRATE",
    category: "Characters",
    clues: ["Ship", "Treasure", "Outlaw"],
  },
  {
    word: "DETECTIVE",
    category: "Characters",
    clues: ["Mystery", "Evidence", "Investigation"],
  },
  {
    word: "ASTRONAUT",
    category: "Characters",
    clues: ["Space", "Suit", "Explorer"],
  },
  {
    word: "SUPERHERO",
    category: "Characters",
    clues: ["Comic", "Secret identity", "Powers"],
  },
  {
    word: "OCTOPUS",
    category: "Animals",
    clues: ["Ocean", "Many limbs", "Camouflage"],
  },
  {
    word: "OWL",
    category: "Animals",
    clues: ["Night-time", "Silent", "Wide eyes"],
  },
  {
    word: "CAMEL",
    category: "Animals",
    clues: ["Desert", "Journey", "Hump"],
  },
  {
    word: "BEE",
    category: "Animals",
    clues: ["Garden", "Busy", "Buzzing"],
  },
  {
    word: "SLOTH",
    category: "Animals",
    clues: ["Unhurried", "Tree-dweller", "Sleepy"],
  },
  {
    word: "CROISSANT",
    category: "Food",
    clues: ["French", "Flaky", "Crescent"],
  },
  {
    word: "NOODLES",
    category: "Food",
    clues: ["Bowl", "Long", "Slurped"],
  },
  {
    word: "ICE CREAM",
    category: "Food",
    clues: ["Frozen", "Scoop", "Sweet"],
  },
  {
    word: "AVOCADO",
    category: "Food",
    clues: ["Green", "Creamy", "Stone"],
  },
  {
    word: "SANDWICH",
    category: "Food",
    clues: ["Lunch", "Layers", "Filling"],
  },
  {
    word: "MUSEUM",
    category: "Places",
    clues: ["Collection", "Quiet", "Exhibits"],
  },
  {
    word: "BEACH",
    category: "Places",
    clues: ["Holiday", "Shore", "Sand"],
  },
  {
    word: "SUPERMARKET",
    category: "Places",
    clues: ["Aisles", "Trolley", "Shopping"],
  },
  {
    word: "PLAYGROUND",
    category: "Places",
    clues: ["Children", "Climbing", "Swings"],
  },
  {
    word: "CINEMA",
    category: "Places",
    clues: ["Dark", "Big screen", "Tickets"],
  },
  {
    word: "SUITCASE",
    category: "Objects",
    clues: ["Travel", "Packed", "Luggage"],
  },
  {
    word: "ALARM CLOCK",
    category: "Objects",
    clues: ["Morning", "Bedside", "Time"],
  },
  {
    word: "TORCH",
    category: "Objects",
    clues: ["Darkness", "Battery", "Beam"],
  },
  {
    word: "MIRROR",
    category: "Objects",
    clues: ["Bathroom", "Reflection", "Glass"],
  },
  {
    word: "BICYCLE",
    category: "Objects",
    clues: ["Balance", "Pedals", "Two wheels"],
  },
  {
    word: "GARDENING",
    category: "Activities",
    clues: ["Outdoors", "Soil", "Growing"],
  },
  {
    word: "SWIMMING",
    category: "Activities",
    clues: ["Water", "Exercise", "Lanes"],
  },
  {
    word: "PAINTING",
    category: "Activities",
    clues: ["Colour", "Brush", "Canvas"],
  },
  {
    word: "DANCING",
    category: "Activities",
    clues: ["Music", "Movement", "Rhythm"],
  },
  {
    word: "FOOTBALL",
    category: "Activities",
    clues: ["Pitch", "Match", "Goal"],
  },
  {
    word: "MOON",
    category: "Nature",
    clues: ["Night", "Phases", "Orbit"],
  },
  {
    word: "FOREST",
    category: "Nature",
    clues: ["Shaded", "Trees", "Woodland"],
  },
  {
    word: "OCEAN",
    category: "Nature",
    clues: ["Salty", "Deep", "Waves"],
  },
  {
    word: "TORNADO",
    category: "Nature",
    clues: ["Weather", "Spinning", "Funnel"],
  },
  {
    word: "SUNFLOWER",
    category: "Nature",
    clues: ["Tall", "Seeds", "Yellow"],
  },
  {
    word: "SMARTWATCH",
    category: "Technology",
    clues: ["Connected", "Fitness", "Notifications"],
  },
  {
    word: "DRONE",
    category: "Technology",
    clues: ["Remote", "Flying", "Camera"],
  },
  {
    word: "GAME CONSOLE",
    category: "Technology",
    clues: ["Controller", "Screen", "Multiplayer"],
  },
  {
    word: "PRINTER",
    category: "Technology",
    clues: ["Paper", "Ink", "Copies"],
  },
  {
    word: "CALCULATOR",
    category: "Technology",
    clues: ["Numbers", "Buttons", "Answer"],
  },
  {
    word: "MERMAID",
    category: "Characters",
    clues: ["Legend", "Ocean", "Tail"],
  },
  {
    word: "KNIGHT",
    category: "Characters",
    clues: ["Armour", "Quest", "Sword"],
  },
  {
    word: "CLOWN",
    category: "Characters",
    clues: ["Colourful", "Circus", "Make-up"],
  },
  {
    word: "CHEF",
    category: "Characters",
    clues: ["Kitchen", "Uniform", "Cooking"],
  },
  {
    word: "NINJA",
    category: "Characters",
    clues: ["Secretive", "Agile", "Warrior"],
  },
  {
    word: "ELEPHANT",
    category: "Animals",
    clues: ["Trunk", "Tusks", "Very large"],
  },
  {
    word: "TIGER",
    category: "Animals",
    clues: ["Stripes", "Big cat", "Roar"],
  },
  {
    word: "KANGAROO",
    category: "Animals",
    clues: ["Pouch", "Hopping", "Australia"],
  },
  {
    word: "PEACOCK",
    category: "Animals",
    clues: ["Tail display", "Bright feathers", "Fan shape"],
  },
  {
    word: "SQUIRREL",
    category: "Animals",
    clues: ["Bushy tail", "Acorns", "Tree-climbing"],
  },
  {
    word: "CHOCOLATE",
    category: "Food",
    clues: ["Cocoa", "Bar", "Melts"],
  },
  {
    word: "CUPCAKE",
    category: "Food",
    clues: ["Icing", "Paper case", "Sprinkles"],
  },
  {
    word: "PINEAPPLE",
    category: "Food",
    clues: ["Spiky skin", "Leafy crown", "Tropical"],
  },
  {
    word: "OMELETTE",
    category: "Food",
    clues: ["Eggs", "Folded", "Frying pan"],
  },
  {
    word: "ZOO",
    category: "Places",
    clues: ["Animals", "Enclosures", "Keeper"],
  },
  {
    word: "HOSPITAL",
    category: "Places",
    clues: ["Doctors", "Patients", "Wards"],
  },
  {
    word: "AQUARIUM",
    category: "Places",
    clues: ["Fish", "Glass tanks", "Viewing tunnel"],
  },
  {
    word: "STADIUM",
    category: "Places",
    clues: ["Crowd", "Pitch", "Match"],
  },
  {
    word: "BAKERY",
    category: "Places",
    clues: ["Fresh bread", "Oven", "Pastries"],
  },
  {
    word: "SCISSORS",
    category: "Objects",
    clues: ["Blades", "Handles", "Cutting"],
  },
  {
    word: "PILLOW",
    category: "Objects",
    clues: ["Bed", "Soft", "Head"],
  },
  {
    word: "MAGNET",
    category: "Objects",
    clues: ["Attracts metal", "Poles", "Fridge"],
  },
  {
    word: "LADDER",
    category: "Objects",
    clues: ["Rungs", "Climbing", "Leaning"],
  },
  {
    word: "BINOCULARS",
    category: "Objects",
    clues: ["Two lenses", "Far away", "Magnifies"],
  },
  {
    word: "SURFING",
    category: "Activities",
    clues: ["Waves", "Board", "Ocean"],
  },
  {
    word: "KNITTING",
    category: "Activities",
    clues: ["Wool", "Needles", "Stitches"],
  },
  {
    word: "CHESS",
    category: "Activities",
    clues: ["King", "Strategy", "Checkmate"],
  },
  {
    word: "FISHING",
    category: "Activities",
    clues: ["Rod", "Hook", "Bait"],
  },
  {
    word: "HIDE AND SEEK",
    category: "Activities",
    clues: ["Counting", "Hiding", "Seeker"],
  },
  {
    word: "GLACIER",
    category: "Nature",
    clues: ["Ice", "Slow-moving", "Melting"],
  },
  {
    word: "EARTHQUAKE",
    category: "Nature",
    clues: ["Shaking", "Ground", "Fault"],
  },
  {
    word: "CORAL REEF",
    category: "Nature",
    clues: ["Marine habitat", "Shallow sea", "Fish"],
  },
  {
    word: "AURORA",
    category: "Nature",
    clues: ["Polar sky", "Dancing lights", "Green glow"],
  },
  {
    word: "LAPTOP",
    category: "Technology",
    clues: ["Portable", "Keyboard", "Folding screen"],
  },
  {
    word: "SMARTPHONE",
    category: "Technology",
    clues: ["Touchscreen", "Apps", "Calls"],
  },
  {
    word: "MICROPHONE",
    category: "Technology",
    clues: ["Voice", "Recording", "Amplifies"],
  },
  {
    word: "VR HEADSET",
    category: "Technology",
    clues: ["Goggles", "Virtual world", "Immersive"],
  },
  {
    word: "COWBOY",
    category: "Characters",
    clues: ["Wide hat", "Horse", "Lasso"],
  },
  {
    word: "FAIRY",
    category: "Characters",
    clues: ["Wings", "Tiny", "Wand"],
  },
  {
    word: "VAMPIRE",
    category: "Characters",
    clues: ["Fangs", "Nocturnal", "Blood"],
  },
  {
    word: "PRINCESS",
    category: "Characters",
    clues: ["Crown", "Royal", "Palace"],
  },
  {
    word: "GHOST",
    category: "Characters",
    clues: ["Haunting", "Spooky", "Floats"],
  },
] as const;
