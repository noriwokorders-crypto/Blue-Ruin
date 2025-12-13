# Tiled Map Tester - Setup Instructions

## Quick Start

1. **Start a Local Web Server** (Required due to CORS restrictions)
   
   You need to run a local web server to test the map. Choose one of these options:

   ### Option 1: Python (if installed)
   ```bash
   cd "C:\Users\Νίκος\Desktop\Map Folder"
   python -m http.server 8000
   ```
   Then open: http://localhost:8000/test-map.html

   ### Option 2: Node.js (if installed)
   ```bash
   cd "C:\Users\Νίκος\Desktop\Map Folder"
   npx http-server -p 8000
   ```
   Then open: http://localhost:8000/test-map.html

   ### Option 3: VS Code Live Server
   - Install the "Live Server" extension in VS Code
   - Right-click on `test-map.html` and select "Open with Live Server"

2. **Controls:**
   - **WASD** or **Arrow Keys**: Move character
   - **C Key**: Toggle collision box visualization (red outlines)
   - **Mouse**: Move mouse to look around (camera follows character)

## Features

✅ **Map Rendering**: Displays your Tiled map with all layers  
✅ **Sprite Animations**: Animated sprites play their animations automatically  
✅ **Spawn Point**: Character spawns at the "Spawn Point Character" object location  
✅ **Collision Detection**: All sprites and tiles have collision detection  
✅ **Infinite Map Support**: Handles infinite/chunked maps  

## Troubleshooting

- **Images not loading**: Make sure all image files referenced in `.tsx` files are in the correct relative paths
- **Map not showing**: Check browser console (F12) for errors
- **Character not spawning**: Verify the "Spawn Point Character" object layer exists in your map

## Notes

- The character is represented as a red rectangle for testing
- Collision boxes can be toggled with the C key for debugging
- The map uses a tile size of 64x64 pixels
- Character speed is 200 pixels per second
