// Map Loader for Tiled JSON maps
class MapLoader {
    constructor() {
        this.mapData = null;
        this.tilesets = new Map();
        this.tilesetImages = new Map();
        this.animations = new Map();
        this.tileCollisionShapes = new Map();
    }

    async loadMap(mapPath) {
        // Remember map directory to resolve relative image paths
        this.mapDir = (mapPath || '').replace(/[^\/\\]+$/, '');
        const response = await fetch(mapPath);
        this.mapData = await response.json();
        
        // Load all tilesets
        await this.loadTilesets();
        
        // Debug: report what we parsed
        try {
            console.group('MapLoader: loaded map');
            console.log('map:', (this.mapData && this.mapData.width) ? `${this.mapData.width}x${this.mapData.height}` : this.mapData);
            console.log('tilesets parsed:', Array.from(this.tilesets.keys()).length);
            console.log('tileCollisionShapes count:', this.tileCollisionShapes.size);
            // list up to 20 sample GIDs with details
            if (this.tileCollisionShapes.size) {
                const sample = Array.from(this.tileCollisionShapes.keys()).slice(0, 20);
                console.log('sample GIDs with shapes:', sample);
                for (const gid of sample) {
                    const shapes = this.tileCollisionShapes.get(gid);
                    const tsInfo = this.getTilesetForTile(gid);
                    const tsTileW = (tsInfo && tsInfo.tileset && tsInfo.tileset.tilewidth) || this.mapData.tilewidth;
                    const tsTileH = (tsInfo && tsInfo.tileset && tsInfo.tileset.tileheight) || this.mapData.tileheight;
                    console.group(`GID ${gid}`);
                    console.log('tileset firstgid:', tsInfo && tsInfo.firstgid, 'tileset tile size:', tsTileW, 'x', tsTileH);
                    console.log('shapes count:', shapes.length);
                    console.log('shapes sample:', shapes.slice(0,3));
                    console.groupEnd();
                }
            }
            console.groupEnd();
        } catch (e) {
            console.warn('MapLoader debug failed', e);
        }

        return this.mapData;
    }

    async loadTilesets() {
        if (!this.mapData || !this.mapData.tilesets) return;

        for (const tileset of this.mapData.tilesets) {
            if (tileset.source) {
                await this.loadTilesetFromFile(tileset);
            } else if (tileset.image) {
                // Embedded tileset
                await this.loadEmbeddedTileset(tileset);
            }
        }
    }

    async loadTilesetFromFile(tilesetRef) {
        try {
            // Load the .tsx file
            const tsxResponse = await fetch(tilesetRef.source);
            const tsxText = await tsxResponse.text();
            const parser = new DOMParser();
            const tsxDoc = parser.parseFromString(tsxText, 'text/xml');
            
            const tileset = tsxDoc.querySelector('tileset');
            if (!tileset) return;

            const name = tileset.getAttribute('name');
            const tileWidth = parseInt(tileset.getAttribute('tilewidth'));
            const tileHeight = parseInt(tileset.getAttribute('tileheight'));
            const columns = parseInt(tileset.getAttribute('columns'));
            
            const image = tileset.querySelector('image');
            if (!image) return;

            const imageSource = image.getAttribute('source');
            const imageWidth = parseInt(image.getAttribute('width'));
            const imageHeight = parseInt(image.getAttribute('height'));

            // Load animation data
            const animationTiles = tileset.querySelectorAll('tile');
            const animData = {};
            const tileObjects = {};

            animationTiles.forEach(tile => {
                const tileId = parseInt(tile.getAttribute('id'));
                const animation = tile.querySelector('animation');
                if (animation) {
                    const frames = [];
                    animation.querySelectorAll('frame').forEach(frame => {
                        frames.push({
                            tileid: parseInt(frame.getAttribute('tileid')),
                            duration: parseInt(frame.getAttribute('duration'))
                        });
                    });
                    animData[tileId] = frames;
                }

                // Parse per-tile objectgroup (collision shapes) if present
                const objGroup = tile.querySelector('objectgroup');
                if (objGroup) {
                    const objs = [];
                    objGroup.querySelectorAll('object').forEach(o => {
                        const ox = parseFloat(o.getAttribute('x')) || 0;
                        const oy = parseFloat(o.getAttribute('y')) || 0;
                        const ow = parseFloat(o.getAttribute('width')) || 0;
                        const oh = parseFloat(o.getAttribute('height')) || 0;

                        const polygon = [];
                        const poly = o.querySelector('polygon');
                        if (poly) {
                            const points = poly.getAttribute('points').trim().split(/\s+/);
                            points.forEach(pt => {
                                const [px, py] = pt.split(',').map(Number);
                                polygon.push({ x: px, y: py });
                            });
                        }

                        const ellipse = !!o.querySelector('ellipse');

                        objs.push({ x: ox, y: oy, width: ow, height: oh, polygon: polygon.length ? polygon : null, ellipse });
                    });
                    if (objs.length) tileObjects[tileId] = objs;
                }
            });

            // Load the image - try multiple path variations (try relative to TSX and map)
            const img = new Image();
            await new Promise((resolve, reject) => {
                // Extract just the filename from the path
                const filename = imageSource.split('/').pop() || imageSource.split('\\').pop();

                // Tileset (.tsx) may be in a different directory; build candidate base paths
                const tilesetSourceDir = (tilesetRef.source || '').replace(/[^\/\\]+$/, '');
                const mapDir = this.mapDir || '';

                const normalize = p => (p || '').replace(/\\/g, '/');
                const join = (a, b) => {
                    if (!a) return b;
                    return normalize(a).replace(/\/$/, '') + '/' + normalize(b).replace(/^\//, '');
                };

                // Try multiple path variations: original, decoded, relative to TSX dir, relative to map dir, just filename
                const pathsToTry = [
                    normalize(imageSource),
                    decodeURI(normalize(imageSource)),
                    join(tilesetSourceDir, normalize(imageSource)),
                    join(mapDir, normalize(imageSource)),
                    filename,
                    decodeURI(filename)
                ];

                let currentPathIndex = 0;

                const tryLoad = () => {
                    if (currentPathIndex >= pathsToTry.length) {
                        console.warn(`Could not load image: ${imageSource} (tried: ${pathsToTry.join(', ')})`);
                        // Create a placeholder image
                        const placeholder = document.createElement('canvas');
                        placeholder.width = imageWidth || 64;
                        placeholder.height = imageHeight || 64;
                        const ctx = placeholder.getContext('2d');
                        ctx.fillStyle = '#ff00ff';
                        ctx.fillRect(0, 0, placeholder.width, placeholder.height);
                        ctx.fillStyle = '#000';
                        ctx.font = '12px Arial';
                        ctx.fillText('Missing', 5, 20);
                        img.src = placeholder.toDataURL();
                        resolve();
                        return;
                    }

                    img.onload = resolve;
                    img.onerror = () => {
                        currentPathIndex++;
                        tryLoad();
                    };
                    const tryUrl = pathsToTry[currentPathIndex];
                    try {
                        img.src = tryUrl;
                    } catch (e) {
                        currentPathIndex++;
                        tryLoad();
                    }
                };

                tryLoad();
            });

            this.tilesets.set(tilesetRef.firstgid, {
                firstgid: tilesetRef.firstgid,
                name: name,
                tilewidth: tileWidth,
                tileheight: tileHeight,
                columns: columns,
                image: img,
                imageWidth: imageWidth,
                imageHeight: imageHeight,
                animations: animData,
                tileObjects: tileObjects
            });

            this.tilesetImages.set(tilesetRef.firstgid, img);
            
            // Store animations with global tile IDs
            for (const [localTileId, frames] of Object.entries(animData)) {
                const globalTileId = tilesetRef.firstgid + parseInt(localTileId);
                this.animations.set(globalTileId, {
                    frames: frames.map(f => ({
                        tileid: tilesetRef.firstgid + f.tileid,
                        duration: f.duration
                    })),
                    currentFrame: 0,
                    elapsed: 0
                });
            }

            // Store tile collision shapes (global IDs)
            for (const [localTileId, shapes] of Object.entries(tileObjects)) {
                const globalTileId = tilesetRef.firstgid + parseInt(localTileId);
                this.tileCollisionShapes.set(globalTileId, shapes);
            }
        } catch (err) {
            console.warn(`Failed to load tileset ${tilesetRef.source}:`, err);
        }
    }

    async loadEmbeddedTileset(tileset) {
        // Embedded tileset image - try safe fallbacks similar to external TSX loader
        const img = new Image();
        await new Promise((resolve, reject) => {
            const imageSource = tileset.image;
            const filename = (imageSource || '').split('/').pop() || (imageSource || '').split('\\').pop();
            const normalize = p => (p || '').replace(/\\/g, '/');
            const pathsToTry = [normalize(imageSource), decodeURI(normalize(imageSource)), filename, decodeURI(filename)];
            let idx = 0;
            const tryLoad = () => {
                if (idx >= pathsToTry.length) {
                    console.warn(`Could not load embedded image: ${imageSource} (tried: ${pathsToTry.join(', ')})`);
                    const placeholder = document.createElement('canvas');
                    placeholder.width = tileset.tilewidth || 64;
                    placeholder.height = tileset.tileheight || 64;
                    const ctx = placeholder.getContext('2d');
                    ctx.fillStyle = '#ff00ff';
                    ctx.fillRect(0, 0, placeholder.width, placeholder.height);
                    img.src = placeholder.toDataURL();
                    resolve();
                    return;
                }

                img.onload = resolve;
                img.onerror = () => {
                    idx++;
                    tryLoad();
                };
                try {
                    img.src = pathsToTry[idx];
                } catch (e) {
                    idx++;
                    tryLoad();
                }
            };
            tryLoad();
        });

        // Extract per-tile objectgroups if present in the embedded tileset JSON
        const tileObjects = {};
        if (tileset.tiles && Array.isArray(tileset.tiles)) {
            for (const t of tileset.tiles) {
                if (t.objectgroup && t.objectgroup.objects) {
                    const objs = [];
                    for (const o of t.objectgroup.objects) {
                        const ox = o.x || 0;
                        const oy = o.y || 0;
                        const ow = o.width || 0;
                        const oh = o.height || 0;
                        const polygon = o.polygon ? o.polygon.map(p => ({ x: p.x, y: p.y })) : null;
                        const ellipse = !!o.ellipse;
                        objs.push({ x: ox, y: oy, width: ow, height: oh, polygon, ellipse });
                    }
                    if (objs.length) tileObjects[t.id] = objs;
                }
            }
        }

        this.tilesets.set(tileset.firstgid, Object.assign({}, tileset, { tileObjects }));
        this.tilesetImages.set(tileset.firstgid, img);

        // Store collision shapes
        for (const [localTileId, shapes] of Object.entries(tileObjects)) {
            const globalTileId = tileset.firstgid + parseInt(localTileId);
            this.tileCollisionShapes.set(globalTileId, shapes);
        }
    }

    getTilesetForTile(gid) {
        if (gid === 0) return null;
        
        let bestTileset = null;
        for (const [firstgid, tileset] of this.tilesets) {
            if (gid >= firstgid && (!bestTileset || firstgid > bestTileset.firstgid)) {
                bestTileset = { firstgid, tileset };
            }
        }
        return bestTileset;
    }

    getTileCollisionShapes(gid) {
        return this.tileCollisionShapes.get(gid) || null;
    }

    getCollisionLayer() {
        if (!this.mapData || !this.mapData.layers) return null;
        
        // Look for a collision layer or use object layers
        for (const layer of this.mapData.layers) {
            if (layer.type === 'objectgroup' && layer.name && 
                (layer.name.toLowerCase().includes('collision') || 
                 layer.name.toLowerCase().includes('collider'))) {
                return layer;
            }
        }
        return null;
    }

    getSpawnPoint() {
        if (!this.mapData || !this.mapData.layers) return null;
        
        for (const layer of this.mapData.layers) {
            if (layer.type === 'objectgroup' && layer.name === 'Spawn Point Character') {
                if (layer.objects && layer.objects.length > 0) {
                    const obj = layer.objects[0];
                    return {
                        x: obj.x,
                        y: obj.y,
                        width: obj.width || 0,
                        height: obj.height || 0
                    };
                }
            }
        }
        return null;
    }

    getEnemySpawnPoints(layerName) {
        if (!this.mapData || !this.mapData.layers) return [];
        
        for (const layer of this.mapData.layers) {
            if (layer.type === 'objectgroup' && layer.name === layerName) {
                if (layer.objects && layer.objects.length > 0) {
                    return layer.objects.map(obj => ({
                        x: obj.x + (obj.width || 0) / 2, // Center of spawn point
                        y: obj.y + (obj.height || 0) / 2,
                        width: obj.width || 0,
                        height: obj.height || 0
                    }));
                }
            }
        }
        return [];
    }

    getAllCollisionObjects() {
        const collisionObjects = [];
        
        if (!this.mapData || !this.mapData.layers) return collisionObjects;
        
        // Get all object layers that might contain collision objects
        for (const layer of this.mapData.layers) {
            if (layer.type === 'objectgroup' && layer.objects) {
                for (const obj of layer.objects) {
                    // Skip spawn point objects, objects explicitly named 'sheep', and boss areas
                    if (layer.name && layer.name.toLowerCase().includes('spawn')) continue;
                    if (layer.name && (
                        layer.name === 'Boss Level 1' ||
                        layer.name === 'Boss level 2' ||
                        layer.name === 'Boss Level 3' ||
                        layer.name === 'Final Boss Blue'
                    )) continue;
                    if (obj.name && obj.name.toLowerCase().includes('spawn')) continue;
                    if (obj.name && obj.name.toLowerCase().includes('sheep')) continue;
                    // Process all objects for collisions. Skip only known non-collision
                    // cases (spawn points) and objects explicitly named 'sheep'.
                    // This ensures we don't accidentally remove collisions for other sprites.

                        // If this object is a tile object (has a gid), Tiled places the
                        // object's y coordinate at the bottom of the tile. Adjust the
                        // y to be the top-left so collision boxes align with rendered
                        // tiles/sprites.
                        let x = obj.x;
                        let y = obj.y;
                        let width = obj.width || 0;
                        let height = obj.height || 0;

                        if (obj.gid) {
                            const tilesetInfo = this.getTilesetForTile(obj.gid);
                            const tileW = (tilesetInfo && tilesetInfo.tileset && tilesetInfo.tileset.tilewidth) || this.mapData.tilewidth;
                            const tileH = (tilesetInfo && tilesetInfo.tileset && tilesetInfo.tileset.tileheight) || this.mapData.tileheight;

                            // If width/height missing, use tile dimensions
                            if (!width) width = tileW;
                            if (!height) height = tileH;

                            // Adjust y because Tiled gives bottom position for tile objects
                            y = obj.y - height;
                        }
                        // If this is a tile object and the tileset provides per-tile shapes,
                        // use those shapes transformed into world coordinates so collisions
                        // exactly match what was drawn in the tileset.
                        if (obj.gid) {
                            const tilesetInfo = this.getTilesetForTile(obj.gid);
                            const tsName = tilesetInfo && tilesetInfo.tileset && tilesetInfo.tileset.name;
                            
                            // Skip 'Sheep' tiles (they shouldn't have collision)
                            if (tsName && tsName.toLowerCase().includes('sheep')) {
                                continue;
                            }

                            // Check if tile has collision shapes - animated tiles CAN have collision if shapes are defined
                            const shapes = this.getTileCollisionShapes(obj.gid);
                            if (shapes && shapes.length) {
                                for (const s of shapes) {
                                    if (s.polygon) {
                                        const poly = s.polygon.map(p => ({ x: x + (s.x || 0) + p.x, y: y + (s.y || 0) + p.y }));
                                        collisionObjects.push({ polygon: poly });
                                    } else if (s.ellipse) {
                                        const cx = x + (s.x || 0) + (s.width || width) / 2;
                                        const cy = y + (s.y || 0) + (s.height || height) / 2;
                                        const rx = (s.width || width) / 2;
                                        const ry = (s.height || height) / 2;
                                        const points = [];
                                        const segments = 16;
                                        for (let k = 0; k < segments; k++) {
                                            const theta = (k / segments) * Math.PI * 2;
                                            points.push({ x: cx + Math.cos(theta) * rx, y: cy + Math.sin(theta) * ry });
                                        }
                                        collisionObjects.push({ polygon: points });
                                    } else {
                                        collisionObjects.push({ x: x + (s.x || 0), y: y + (s.y || 0), width: s.width || width, height: s.height || height });
                                    }
                                }
                                continue; // shapes handled, move to next object
                            }
                        }

                        // If the object defines a polygon (or polyline), convert to world polygon
                        if (obj.polygon && Array.isArray(obj.polygon) && obj.polygon.length) {
                            const poly = obj.polygon.map(p => ({ x: x + p.x, y: y + p.y }));
                            collisionObjects.push({ polygon: poly });
                        } else if (obj.polyline && Array.isArray(obj.polyline) && obj.polyline.length) {
                            const poly = obj.polyline.map(p => ({ x: x + p.x, y: y + p.y }));
                            collisionObjects.push({ polygon: poly });
                                } else {
                                    collisionObjects.push({
                                        x: x,
                                        y: y,
                                        width: width,
                                        height: height
                                    });
                                }
                }
            }
        }
        
        return collisionObjects;
    }
}
