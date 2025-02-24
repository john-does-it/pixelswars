# Pixel's War

Version: 23.11.29.161004

Current state of the game: prototype including most of the core mechanics of the game.

## Description

Be the best commander, lead your army to the victory and show to your defeated friend who is the smartest!

Pixel's War is a free turn by turn game playable on any pc directly in the browser and who's played by two person, on the same computer. Pixel's War features engaging game mechanic centered around commanding armies in grid-based battles. 

Players control various military units, such as infantry, tanks, aircraft, and artillery, each with distinct strengths and weaknesses. The game takes place on grid-based maps, where players strategically move their units across the terrain to engage enemy forces and capture key objectives.

Pixel's War mechanics encourage strategic thinking, adaptability, and long-term planning. Players must consider unit positioning, terrain effects, in game economy and the overall battlefield situation to outwit their opponents and achieve victory.

## Key game mechanics

Turn-Based Gameplay: Players take turns commanding their units, which allows for careful planning and consideration of various tactical options.

Unit Variety: The game features a wide array of units, each with its own movement range, attack range, and abilities. Balancing unit deployment and composition is crucial for success.

Terrain Effects: Different types of terrain affect unit movement, defense. Players need to factor in terrain advantages and disadvantages when positioning their units.

Capture & Produce Mechanic: Players can capture cities, factories, and other structures to earn income, produce new units, and gain tactical advantages.

## Kanban

Project management: our current and future tasks are listed on the Github project below. The main difference between a upgrade and a feature is the scope. Each task receive a rough time estimation in h (hours), d (days), w (weeks), m (months).

See: https://github.com/users/jonathanschoonbroodt/projects/2/views/1

## MVP Scope 

2 playable maps, with core mechanic for deplacement, fight, capture and building units, few units and landscapes availables and the capacity to capture building and create some units inside factories.

## How does it work?

### Global overview

The Pixel's War prototype use only low level web technologies as:
- HTML5 to handle display of grid, UI, unit and cell;
- CSS3 (using LESS preprocessor) to style HTML element;
- JavaScript to handle the logic behind the game.

### LESS CSS

Less (Leaner Style Sheets) is a CSS preprocessor that adds additional features to CSS such as variables, nested rules, and mixins. It allows developers to write clean, maintainable, and reusable code.

First, you need to install LESS. To install LESS, you need to have already node.js installed. See https://lesscss.org.

I also invite you to install Autoprefixer.

To use Less, you can either compile your .less files to .css files using a build system or a tool like lessc, or you can use a browser plugin or a JavaScript runtime to interpret .less files in the browser.

#### Compile LESS CSS

To compile a Less file to CSS, you can use the following command:

```
lessc main.less style.css
```

This will compile the main.less file to a style.css file in the same directory.

You can also use the --autoprefix flag to automatically add vendor prefixes to your CSS rules (you need to install Autoprefixer first). For example:

```
lessc main.less --autoprefix style.css
```

This will compile the main.less file to a style.css file and add vendor prefixes to the generated CSS rules as needed to ensure compatibility with different browsers.

#### LESS File Structure
The project is organized into the following categories:

Constants: These files include variables that define constants used throughout the project.
Tools: These files include utility styles, such as a normalize file and a clearfix file.
Selectors: These file provide overidding for some selector to make customisation easier and can be used to include styles for various types of selectors, such as classes, IDs, and pseudo-classes.
Elements: These files include styles for specific HTML elements.
Components: These files include styles for reusable component.
Structures: These files include styles for structural elements, such as the footer and navbar.
Helpers: These files include utility styles for things like animations, flexbox, text etc.

Warning: examples below are generic and have not been adapted to this specific project. 

Constants are used to define common properties with the @constant: value; syntax.
```
@xxs: 320px;
```

Elements are the most common elements in the UI and are described with a single, meaningful word. They are defined using the .element { property: value; } syntax.
```
.title { 
  font-style: bold; 
}
```

Variants of elements are described using a hyphen followed by a single word, nested inside the element's CSS selector with the &.-variant { property: value; } syntax.
```
.title { 
  font-size: 20px; 
  font-style: bold; 
  
  &.-bigger { 
    font-size: 24px; 
  }
}

```

More complex UI parts, called components, are described with the .component-example { property: value; } syntax.
```
.dialog-container { 
  width: 100%; 
}
```

Variants of components are described in the same way as element variants, using the &.-variant { property: value; } syntax.
```
.search-container { 
  width: 200px; 
  cursor: pointer;
  
  &.-smaller { 
    width: 120px; 
  } 
}
```

Nested components and elements are kept to a minimum to keep the nesting level low.
```
.component-example { 
  property: value; 
  
  .nested-component { 
    property: value; 
  } 
}
```

Helpers, indicated with the prefix "_", are used to simplify development by allowing the definition of common properties directly in the markup. They are defined using the _helpers { property: value; } syntax and may also have variants with the &.-variant { property: value; } syntax.
```
._helpers { 
  property: value; 
  
  &.-variant { 
    property: value; 
  } 
}
```
