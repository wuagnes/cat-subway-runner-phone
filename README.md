# Cat Subway Runner

**BY A1123309**

Cat Subway Runner is a cute cat-themed endless runner game for the browser. The game is built with HTML, CSS, JavaScript, and Three.js. The player controls a cute cat running through a pastel city railway, collecting paw coins, using power-ups, avoiding trains and obstacles, completing missions, and unlocking outfits in the shop.

The game is inspired by the feel of polished mobile runner games, but all characters, UI, and assets are original. The theme is a cat edition runner with a red hoodie cat, paw cap, kitty board, pink blossom trees, glowing paw coins, colorful trains, and soft cream/pink UI panels.

## Project Goal

The goal of this project is to create a complete mini web game that feels playable and polished, not just a simple prototype. It includes real gameplay systems, saved progress, power-ups, missions, shop customization, sound, music, and a modern game-like interface.

## Main Features

- Browser-based endless runner gameplay
- Three-lane railway track system
- Cute cat player character
- Red hoodie, paw cap, shoes, whiskers, face stripes, cheeks, and expressive eyes
- Security officer chase system
- Short caught-by-officer intro before the run starts
- Game over caught animation before showing the result screen
- Paw coin collection
- Multiple coin patterns: line, arc, zigzag, stair, wave, spread, and sky coins
- Obstacles such as trains, barriers, and crates
- Power-ups: magnet, shield, double score, jetpack, and super jump
- Jetpack flying mode with extra coins in the sky
- Magnet effect that pulls nearby paw coins and power-up items toward the cat
- Missions with saved progress and claimable rewards
- Shop system with skins, accessories, and boards
- Large animated character preview in the shop
- 1000 paw coin welcome gift
- Local save system using `localStorage`
- Background music and losing sound support
- Polished mobile-game style UI

## Visual Style

The visual style follows a cute cat-runner direction:

- cute cat character
- Pastel city railway environment
- Pink blossom trees
- Colorful buildings
- Cream and pink game panels
- Rounded buttons and cards
- Paw coin icons
- Soft shadows and bright lighting
- Fun, playful, mobile-game-inspired layout

The game uses procedural Three.js shapes instead of external models, so it stays lightweight and original.

## Gameplay Overview

The player starts on a three-lane railway track. The cat automatically runs forward while the world moves toward the camera, creating an endless runner effect.

The player must:

- Move between lanes
- Jump over low obstacles
- Slide under high obstacles
- Avoid trains and crates
- Collect paw coins
- Pick up power-ups
- Survive as long as possible
- Complete missions

The score increases over time. The game gradually becomes harder as the speed increases.

## Controls

| Action | Key |
|---|---|
| Move left | `A` or `Left Arrow` |
| Move right | `D` or `Right Arrow` |
| Jump | `W` or `Up Arrow` |
| Slide | `S` or `Down Arrow` |
| Start or restart | `Space` |
| Pause or resume | `P` |

## Game Flow

1. The player opens the main menu.
2. The player clicks Play.
3. A short intro plays where the officer catches the cat first.
4. The cat breaks free and starts running.
5. The player collects paw coins and avoids obstacles.
6. If the player crashes badly, the officer catches the cat.
7. A caught animation plays.
8. Background music stops.
9. The losing sound plays.
10. The Game Over screen appears with score and run results.

## Screens

The game includes several UI screens:

- Main Menu
- Game HUD
- Pause Screen
- Game Over Screen
- Shop Screen
- Missions Screen
- Settings Screen

## Main Menu

The main menu shows:

- Game title
- Author label: `BY A1123309`
- Selected cat outfit
- High score
- Total paw coins
- Play, Shop, Missions, and Settings buttons

The welcome gift message is hidden after the 1000 paw coin gift has already been accepted.

## Game HUD

During gameplay, the HUD shows:

- Current score
- Paw coins collected in the current run
- Total paw coins
- High score
- Active power-up timers
- Pause button

## Cat Character

The cat character is designed to be cute and easy to see during gameplay. It includes:

- Large glossy eyes
- Face stripes
- Cheeks
- Smile and tongue
- Whiskers
- Inner ear color
- Red hoodie
- Paw cap
- Shoes
- Tail
- Kitty board

The same cat style is also shown in the shop preview so players can clearly see outfit changes.

## Shop And Customization

The shop lets the player spend paw coins to unlock and equip items.

Shop categories:

- Skins
- Accessories
- Boards

The shop includes a large animated preview. Clicking an item card previews that item before buying or equipping it. This makes skin changing clearer and more like a real mobile game customization screen.

Saved shop data includes:

- Purchased skins
- Purchased accessories
- Purchased boards
- Equipped skin
- Equipped accessory
- Equipped board

## Missions

The missions system tracks progress and gives paw coin rewards.

Mission examples:

- Collect 50 paw coins
- Reach 1000 score
- Jump 20 times
- Slide 10 times
- Use 3 power-ups
- Play 3 rounds

Mission progress is saved with `localStorage`. Completed missions can be claimed once. The mission screen refreshes when opened so progress and reward buttons stay updated.

## Power-Ups

### Magnet

The magnet pulls nearby paw coins and power-up items toward the cat. It has:

- A glowing aura around the player
- Smooth item movement
- Flying coin animation
- Automatic collection when items reach the cat

### Shield

The shield protects the player from one crash.

### Double Score

Double Score increases score gain for a limited time.

### Jetpack

The jetpack lets the cat fly above the tracks. While the jetpack is active, extra paw coins spawn in the sky so the player can collect coins while flying.

### Super Jump

Super Jump lets the cat jump higher than normal.

## Coin Patterns

Coins do not only appear in one curve. The game now includes multiple patterns:

- Straight line
- Arc
- Zigzag
- Stair pattern
- Wave pattern
- Spread pattern across lanes
- Sky coin pattern for jetpack mode

This makes collection more interesting and less repetitive.

## Obstacles

The game includes several obstacle types:

- Low barrier
- High barrier
- Crate
- Train

Different obstacles require different reactions:

- Jump over low barriers
- Slide under high barriers
- Switch lanes to avoid trains and crates

## Officer System

A security officer chases the cat from behind. Before each run begins, the officer catches the cat for a short intro animation. When the player loses, a similar caught animation plays before the Game Over screen.

This makes the chase feel more alive and gives the game a stronger runner-game identity.

## Sound And Music

The game supports local audio files.

Background music:

```text
assets/sounds/background-music.mp3
```

Losing sound:

```text
assets/sounds/losing-sound.mp3
```

Background music starts after the player clicks Play. When the player loses, the background music stops and the losing sound plays.

If the background music file is missing, the game falls back to simple generated tones.

For copyright-safe music, use YouTube Studio Audio Library and choose a track that is safe to use, preferably with attribution not required.

## Settings

The Settings screen includes:

- Music toggle
- Sound effects toggle
- Volume slider
- Reset high score
- Reset all saved data

Settings are saved in `localStorage`.

## Save Data

The game saves progress locally using `localStorage`.

Saved data includes:

- High score
- Total paw coins
- Purchased shop items
- Equipped outfit items
- Mission progress
- Claimed mission rewards
- Music and sound settings
- Welcome gift status

No backend or database is required.

## File Structure

```text
cat-subway-runner/
|-- index.html
|-- style.css
|-- script.js
|-- README.md
`-- assets/
    |-- sounds/
    |   |-- background-music.mp3
    |   |-- losing-sound.mp3
    |   `-- README.md
    `-- three.min.js
```

The empty `images`, `models`, and `textures` folders were removed because the current version uses procedural Three.js shapes instead of external image or model assets.

## How To Run

Open the project folder in a terminal and run:

```bash
python -m http.server 8003
```

Then open:

```text
http://localhost:8003
```

The game can also be opened directly through `index.html`, but using a local server is recommended.

## Technologies Used

- HTML
- CSS
- JavaScript
- Three.js
- Web Audio API
- localStorage

## Important Files

- `index.html`: page structure and UI screens
- `style.css`: visual design, responsive layout, shop preview, and UI styling
- `script.js`: game logic, Three.js scene, player, obstacles, coins, power-ups, shop, missions, audio, and saving
- `assets/three.min.js`: local Three.js library
- `assets/sounds/background-music.mp3`: background music
- `assets/sounds/losing-sound.mp3`: game over sound

## Educational Value

This project is suitable for a university web or game development project because it demonstrates:

- DOM-based UI screens
- Three.js rendering
- Game loop logic
- Collision detection
- Object spawning
- Player controls
- Audio handling
- Persistent save data
- UI/UX design
- Shop and mission systems
- Progressive feature improvement

## Final Note

Cat Subway Runner is an original cat-themed runner game inspired by the polished feeling of popular mobile endless runners, but with its own character design, UI style, item system, and cat railway theme.
