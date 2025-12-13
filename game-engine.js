// Game Engine for rendering and testing the Tiled map
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mapLoader = new MapLoader();
        this.camera = { x: 0, y: 0 };
        this.cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 }; // Screen shake
        this.tileSize = 64;
        
        // Audio context for sound effects
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported, sound effects disabled');
        }
        
        // Character
        this.character = {
            x: 0,
            y: 0,
            width: 68,
            height: 68,
            speed: 300, // Character movement speed
            color: '#ff0000',
            // Health properties
            health: 100,
            maxHealth: 100,
            // Health regeneration
            lastDamageTime: 0, // Time since last damage taken
            regenTimer: 0, // Timer for regeneration ticks
            // Attack properties
            attackCooldown: 0, // Legacy - kept for compatibility
            basicAttackCooldown: 0, // Separate cooldown for basic attack
            strongAttackCooldown: 0, // Separate cooldown for strong attack
            rangedAttackCooldown: 0, // Separate cooldown for ranged attack
            combinedAttackCooldown: 0, // Cooldown for combined attack button (0.5s)
            dashCooldown: 0, // Dash cooldown (already exists, but ensuring it's here)
            magicAttackCooldown: 0, // Cooldown for magic attacks
            attackType: null, // 'basic', 'strong', 'magic'
            baseDamage: 5, // Base damage for basic attacks (increases with level)
            baseStrongDamage: 15, // Base damage for strong attacks (increases with level)
            attackTimer: 0,
            // Weapon mode
            weaponMode: 'melee', // 'melee' or 'ranged'
            // Sprite properties (melee)
            spriteImage: null, // Idle sprite (melee)
            runSpriteImage: null, // Running sprite (melee)
            dashSpriteImage: null, // Dash sprite (melee)
            attackSpriteImage: null, // Static basic attack sprite
            runAttackSpriteImage: null, // Running basic attack sprite
            strongAttackSpriteImage: null, // Static strong attack sprite
            runStrongAttackSpriteImage: null, // Running strong attack sprite
            // Sprite properties (ranged)
            rangedSpriteImage: null, // Idle sprite (ranged)
            rangedRunSpriteImage: null, // Running sprite (ranged)
            rangedDashSpriteImage: null, // Dash sprite (ranged)
            rangedAttackSpriteImage: null, // Static ranged attack sprite (body)
            rangedRunAttackSpriteImage: null, // Running ranged attack sprite (body)
            bowSpriteImage: null, // Bow sprite (overlay) - left/right
            bowUpSpriteImage: null, // Bow sprite for shooting up
            bowDownSpriteImage: null, // Bow sprite for shooting down
            spriteLoaded: false,
            runSpriteLoaded: false,
            dashSpriteLoaded: false,
            attackSpriteLoaded: false,
            runAttackSpriteLoaded: false,
            strongAttackSpriteLoaded: false,
            runStrongAttackSpriteLoaded: false,
            rangedSpriteLoaded: false,
            rangedRunSpriteLoaded: false,
            rangedDashSpriteLoaded: false,
            rangedAttackSpriteLoaded: false,
            rangedRunAttackSpriteLoaded: false,
            bowSpriteLoaded: false,
            bowUpSpriteLoaded: false,
            bowDownSpriteLoaded: false,
            idleFrames: 4,
            runFrames: 6,
            dashFrames: 8,
            attackFrames: 6,
            runAttackFrames: 6,
            strongAttackFrames: 6,
            runStrongAttackFrames: 6,
            rangedIdleFrames: 4,
            rangedRunFrames: 6,
            rangedDashFrames: 8,
            rangedAttackFrames: 6,
            rangedRunAttackFrames: 6,
            bowFrames: 6,
            // Hurt and death sprite properties
            hurtSpriteImage: null,
            hurtSpriteLoaded: false,
            hurtFrames: 4,
            deathSpriteImage: null,
            deathSpriteLoaded: false,
            deathFrames: 8,
            rangedHurtSpriteImage: null,
            rangedHurtSpriteLoaded: false,
            rangedDeathSpriteImage: null,
            rangedDeathSpriteLoaded: false,
            isHurt: false,
            hurtTimer: 0,
            isDead: false,
            deathTimer: 0,
            // Shooting direction for ranged attacks
            shootDirection: { x: 0, y: -1 }, // Default: up
            currentFrame: 0,
            frameTime: 0,
            frameDuration: 0.2, // 0.2 seconds per frame (5 fps for idle)
            runFrameDuration: 0.1, // 0.1 seconds per frame (10 fps for running)
            dashFrameDuration: 0.05, // 0.05 seconds per frame (20 fps for dash)
            attackFrameDuration: 0.05, // 0.05 seconds per frame (20 fps for attack)
            runAttackFrameDuration: 0.05, // 0.05 seconds per frame (20 fps for running attack)
            strongAttackFrameDuration: 0.0575, // 0.0575 seconds per frame (15% slower for visibility)
            runStrongAttackFrameDuration: 0.0575, // 0.0575 seconds per frame (15% slower for visibility)
            spriteFrameWidth: 42, // Original sprite frame size
            spriteFrameHeight: 42,
            isMoving: false,
            wasMoving: false, // Track previous movement state for animation switching
            facingRight: true, // Direction the character is facing
            lastMoveDirection: { x: 0, y: 0 }, // Track last movement direction for dash
            // Dash properties
            isDashing: false,
            dashCooldown: 0,
            dashDuration: 0,
            dashSpeed: 500, // Dash speed (faster than normal movement)
            dashDistance: 150, // Dash distance in pixels
            dashDirection: { x: 0, y: 0 }
        };
        
        // Spawn point
        this.spawnPoint = null;
        
        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        // Collision objects
        this.collisionObjects = [];
        
        // Enemies
        this.enemies = [];
        
        // Arrows (projectiles)
        this.arrows = [];
        this.enemyArrows = []; // Enemy projectiles
        this.damagePopups = []; // Floating damage numbers
        
        // Arrow sprites
        this.arrowDownSprite = null; // Vertical (3x14)
        this.arrowLeftSprite = null; // Horizontal (14x3)
        this.arrowDiagonalRightSprite = null; // Diagonal right up (12x14)
        this.arrowDiagonalLeftSprite = null; // Diagonal left up (12x14)
        this.arrowSpritesLoaded = false;
        
        // Magic spell sprites
        this.fireSplittersSprite = null; // Fire Splitters spell sprite (128x64 per frame, 6 frames)
        this.fireSplittersSpriteLoaded = false;
        
        this.shieldSprite = null; // Shield spell sprite (128x128 per frame, 15 frames: 3 rows x 5 frames)
        this.shieldSpriteLoaded = false;
        
        // Magic projectiles array
        this.magicProjectiles = [];
        
        // Shield effect
        this.shieldEffect = null; // Active shield effect on character
        
        // Heavy attack effect sprite
        this.heavyAttackEffectSprite = null; // Heavy attack effect (192x128 per frame, 5 frames)
        this.heavyAttackEffectSpriteLoaded = false;
        
        // Active heavy attack effects
        this.heavyAttackEffects = [];
        
        // Health bar sprite
        this.healthBarSprite = null;
        this.healthBarSpriteLoaded = false;
        
        // Enemy sprites
        this.enemyIdleSprite = null;
        this.enemyMoveSprite = null;
        this.enemyAttackSprite = null;
        this.enemySpritesLoaded = false;
        
        // Yellow Knight sprites
        this.yellowKnightIdleSprite = null;
        this.yellowKnightMoveSprite = null;
        this.yellowKnightAttackSprite = null;
        this.yellowKnightBlockSprite = null;
        this.yellowKnightSpritesLoaded = false;
        
        // Yellow Archer sprites
        this.yellowArcherIdleSprite = null;
        this.yellowArcherRunSprite = null;
        this.yellowArcherShootSprite = null;
        this.yellowArcherSpritesLoaded = false;
        
        // Blue Golem Boss sprites
        this.blueGolemIdleSprite = null;
        this.blueGolemWalkSprite = null;
        this.blueGolemAttackSprite = null;
        this.blueGolemDieSprite = null;
        this.blueGolemHurtSprite = null;
        this.blueGolemSpritesLoaded = false;
        
        // Orc Barbarian sprites
        this.orcBarbarianMoveSprite = null;
        this.orcBarbarianAttackSprite = null;
        this.orcBarbarianSpritesLoaded = false;
        
        // Quest NPC (Monk) sprites
        this.questNPCIdleSprite = null;
        this.questNPCSpritesLoaded = false;
        this.questNPC = null; // Quest NPC object
        this.bossQuestNPC = null; // Boss Quest NPC object
        
        // Quest objectives (array to support multiple objectives)
        this.questObjectives = [
            // { active: false, text: "Main Quest: Save My Little Brother" }
        ];
        
        // Boss quest state
        this.bossQuest = {
            started: false, // Quest has been started (dialog completed)
            bossDefeated: false, // Blue Golem boss has been defeated
            completed: false, // Quest has been completed (XP reward given)
            objectiveText: "Defeat the Boss Of the Territory"
        };
        
        // XP and Level System
        this.xpSystem = {
            currentXP: 0,
            level: 1,
            // XP needed for each level (cumulative) - 4x harder for end-game progression
            levelThresholds: [0, 400, 1000, 1800, 2800, 4000, 5600, 7600, 10000],
            // XP rewards per enemy type
            xpRewards: {
                goblin: 15,
                yellowKnight: 25,
                yellowArcher: 20,
                orcBarbarian: 35,
                blueGolem: 100, // Boss gives 100 XP
                default: 20
            }
        };
        
        // Player abilities (unlocked at levels 3, 5, 8)
        this.abilities = {
            // Level 3 choices
            multishot: false,       // Ranged attacks fire 3 arrows
            oneManShow: false,      // 15% damage reduction + 15% more health
            // Level 5 choices
            berserker: false,       // 30% more damage when below 50% health
            vampiric: false,        // Heal 5 HP per kill
            // Level 8 choices
            titansWrath: false,     // Strong attacks deal double damage
            swiftAssassin: false    // 40% reduced cooldowns
        };
        
        // Spells (unlocked at level 2)
        this.spells = {
            fireSplitters: false,   // Fire Splitters spell (50 damage, 10s cooldown)
            shield: false,          // Shield spell (absorbs 5 attacks, 30s cooldown)
            spell3: false
        };
        
        // Ability choice pending (when player levels up to 2, 3, 5, or 8)
        this.pendingAbilityChoice = null; // Will be 2, 3, 5, or 8 when choice is needed
        this.isAbilityChoiceOpen = false;
        
        // Animation state
        this.animationTime = 0;
        
        // Setup event listeners
        this.setupInput();
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            // Prevent default for arrow keys and WASD to stop page scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        // Make canvas focusable so it can receive keyboard events
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.style.outline = 'none';
        
        // Focus canvas when clicked
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
    }

    async loadMap(mapPath) {
        await this.mapLoader.loadMap(mapPath);
        
        // Load character sprite
        await this.loadCharacterSprite();
        
        // Get spawn point
        const spawnPoint = this.mapLoader.getSpawnPoint();
        if (spawnPoint) {
            this.spawnPoint = spawnPoint;
            this.character.x = spawnPoint.x + (spawnPoint.width || 0) / 2;
            this.character.y = spawnPoint.y + (spawnPoint.height || 0) / 2;
            // Center character on screen (accounting for character center, not top-left)
            const charCenterX = this.character.x + this.character.width / 2;
            const charCenterY = this.character.y + this.character.height / 2;
            this.camera.x = charCenterX - this.canvas.width / 2;
            this.camera.y = charCenterY - this.canvas.height / 2;
            
            // Create Quest NPC near spawn point (to the left of spawn point)
            this.questNPC = {
                x: spawnPoint.x + (spawnPoint.width || 0) - 400, // 400 pixels to the left of spawn point edge (moved 500px left from +100)
                y: spawnPoint.y + (spawnPoint.height || 0) / 2 - 65, // Center vertically, adjust for NPC height (130/2 = 65)
                width: 130, // Scaled down from 192x192 to 130x130
                height: 130,
                idleFrames: 6, // 6 frames for idle animation
                currentFrame: 0,
                frameTime: 0,
                frameDuration: 0.2, // 0.2 seconds per frame (5 fps for idle)
                // Dialog system
                showExclamation: true, // Show exclamation point until talked to
                isTalking: false, // Is dialog active
                dialogIndex: 0, // Current dialog message index
                dialogMessages: [
                    "Welcome, warrior! Let me explain the basics of combat.",
                    "Use the joystick to move, and the attack buttons to fight enemies.",
                    "You can switch between melee and ranged weapons with the swap button.",
                    "Your brother has been captured by the Blue Stronghold!",
                    "You must infiltrate the stronghold and rescue him before it's too late!",
                    "Good luck, and may the gods be with you!"
                ]
            };
            console.log('Quest NPC created at:', this.questNPC.x, this.questNPC.y);
        }
        
        // Get collision objects
        this.collisionObjects = this.mapLoader.getAllCollisionObjects();
        
        // Also create collision from tile layers (non-zero tiles)
        this.buildTileCollisions();

        // Ensure character is not placed inside a collision; nudge if necessary
        this.ensureCharacterNotColliding();
        
        // Spawn enemies at spawn points
        this.spawnEnemies();

        // Debug: report how many collisions we built
        try {
            console.group('GameEngine: collision summary');
            console.log('object-layer collisions:', this.collisionObjects.filter(o => !o.gid && !o.polygon).length);
            console.log('tile collisions (rect or polygon):', this.collisionObjects.filter(o => o.gid || o.polygon).length);
            // show a couple of sample collision objects
            console.log('sample collisions:', this.collisionObjects.slice(0, 8));
            console.groupEnd();
        } catch (e) {
            console.warn('GameEngine debug failed', e);
        }
    }

    buildTileCollisions() {
        if (!this.mapLoader.mapData || !this.mapLoader.mapData.layers) return;

        const tileSize = this.tileSize;
        const mapTileH = (this.mapLoader.mapData && this.mapLoader.mapData.tileheight) || tileSize;

        const isDecorLayer = (name) => {
            const n = (name || '').toLowerCase();
            return n.includes('decor') || n.includes('background') || n.includes('water');
        };

        const isWalkableLayer = (name) => {
            const n = (name || '').toLowerCase();
            // Skip ground/walkable layers - these should not have collision
            return n.includes('ground') || n.includes('floor') || n.includes('grass') || 
                   n.includes('tile layer 1') || n.includes('base') || n.includes('terrain');
        };

        const addShapesForGid = (gid, x, y, layerName) => {
            if (gid === 0) return;

            const tsInfoCheck = this.mapLoader.getTilesetForTile(gid);
            const tsNameCheck = tsInfoCheck && tsInfoCheck.tileset && tsInfoCheck.tileset.name;
            
            // Check if tile has collision shapes first
            const shapes = this.mapLoader.getTileCollisionShapes(gid);
            
            // Skip sheep tiles (they shouldn't have collision)
            if (tsNameCheck && tsNameCheck.toLowerCase().includes('sheep')) return;
            
            // Only add collision if the tile has explicit collision shapes defined
            // This prevents ground tiles from having collision
            // NOTE: Animated tiles CAN have collision if they have shapes defined (like trees)
            if (shapes && shapes.length) {
                for (const s of shapes) {
                    if (s.polygon) {
                        const tsInfoForPoly = this.mapLoader.getTilesetForTile(gid);
                        const tsTileHForPoly = (tsInfoForPoly && tsInfoForPoly.tileset && tsInfoForPoly.tileset.tileheight) || tileSize;
                        const yOffsetForPoly = tsTileHForPoly > mapTileH ? -(tsTileHForPoly - mapTileH) : 0;

                        const worldPoly = s.polygon.map(p => ({ x: x + (s.x || 0) + p.x, y: y + yOffsetForPoly + (s.y || 0) + p.y }));
                        this.collisionObjects.push({ polygon: worldPoly, gid: gid });
                    } else if (s.ellipse) {
                        const tsInfoForShape = this.mapLoader.getTilesetForTile(gid);
                        const tsTileHForShape = (tsInfoForShape && tsInfoForShape.tileset && tsInfoForShape.tileset.tileheight) || tileSize;
                        const yOffsetForShape = tsTileHForShape > mapTileH ? -(tsTileHForShape - mapTileH) : 0;

                        const cx = x + (s.x || 0) + (s.width || tileSize) / 2;
                        const cy = y + yOffsetForShape + (s.y || 0) + (s.height || tileSize) / 2;
                        const rx = (s.width || tileSize) / 2;
                        const ry = (s.height || tileSize) / 2;
                        const points = [];
                        const segments = 16;
                        for (let k = 0; k < segments; k++) {
                            const theta = (k / segments) * Math.PI * 2;
                            points.push({ x: cx + Math.cos(theta) * rx, y: cy + Math.sin(theta) * ry });
                        }
                        this.collisionObjects.push({ polygon: points, gid: gid });
                    } else {
                        const tsInfoForShape = this.mapLoader.getTilesetForTile(gid);
                        const tsTileHForShape = (tsInfoForShape && tsInfoForShape.tileset && tsInfoForShape.tileset.tileheight) || tileSize;
                        const yOffsetForShape = tsTileHForShape > mapTileH ? -(tsTileHForShape - mapTileH) : 0;
                        this.collisionObjects.push({ x: x + (s.x || 0), y: y + yOffsetForShape + (s.y || 0), width: s.width || tileSize, height: s.height || tileSize, gid: gid });
                    }
                }
            }
            // REMOVED: No longer adding default rectangles for tiles without shapes
            // This was causing ALL tiles (including ground) to have collision
        };

        for (const layer of this.mapLoader.mapData.layers) {
            if (layer.type === 'tilelayer' && layer.visible !== false) {
                const layerName = (layer.name || '').toLowerCase();
                // Skip decor layers and walkable/ground layers
                if (isDecorLayer(layerName) || isWalkableLayer(layerName)) continue;

                if (layer.chunks) {
                    for (const chunk of layer.chunks) {
                        const chunkX = chunk.x * tileSize;
                        const chunkY = chunk.y * tileSize;
                        for (let i = 0; i < chunk.data.length; i++) {
                            const gid = chunk.data[i];
                            if (gid === 0) continue;
                            const x = (i % chunk.width) * tileSize + chunkX;
                            const y = Math.floor(i / chunk.width) * tileSize + chunkY;
                            addShapesForGid.call(this, gid, x, y, layerName);
                        }
                    }
                } else if (layer.data) {
                    const width = layer.width || this.mapLoader.mapData.width;
                    for (let i = 0; i < layer.data.length; i++) {
                        const gid = layer.data[i];
                        if (gid === 0) continue;
                        const x = (i % width) * tileSize;
                        const y = Math.floor(i / width) * tileSize;
                        addShapesForGid.call(this, gid, x, y, layerName);
                    }
                }
            } else if (layer.type === 'objectgroup') {
                if (layer.objects) {
                    for (const obj of layer.objects) {
                        // Skip spawn points, named sheep objects, and boss areas
                        if (layer.name && (
                            layer.name.toLowerCase().includes('spawn') ||
                            layer.name === 'Boss Level 1' ||
                            layer.name === 'Boss level 2' ||
                            layer.name === 'Boss Level 3' ||
                            layer.name === 'Final Boss Blue'
                        )) {
                            continue;
                        }
                        const lname = (layer.name || '').toLowerCase();
                        if (lname.includes('spawn')) continue;
                        if (obj.name && obj.name.toLowerCase().includes('spawn')) continue;
                        if (obj.name && obj.name.toLowerCase().includes('sheep')) continue;

                        let x = obj.x || 0;
                        let y = obj.y || 0;
                        let width = obj.width || 0;
                        let height = obj.height || 0;

                        if (obj.gid) {
                            const tilesetInfo = this.mapLoader.getTilesetForTile(obj.gid);
                            const tileW = (tilesetInfo && tilesetInfo.tileset && tilesetInfo.tileset.tilewidth) || tileSize;
                            const tileH = (tilesetInfo && tilesetInfo.tileset && tilesetInfo.tileset.tileheight) || tileSize;
                            if (!width) width = tileW;
                            if (!height) height = tileH;
                            y = obj.y - height; // Tiled places tile object y at bottom

                            // If tileset defines shapes for the gid, add them transformed
                            const shapes = this.mapLoader.getTileCollisionShapes(obj.gid);
                            if (shapes && shapes.length) {
                                for (const s of shapes) {
                                    if (s.polygon) {
                                        const poly = s.polygon.map(p => ({ x: x + (s.x || 0) + p.x, y: y + (s.y || 0) + p.y }));
                                        this.collisionObjects.push({ polygon: poly });
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
                                        this.collisionObjects.push({ polygon: points });
                                    } else {
                                        this.collisionObjects.push({ x: x + (s.x || 0), y: y + (s.y || 0), width: s.width || width, height: s.height || height });
                                    }
                                }
                                continue;
                            }
                        }

                        // Polygons and polylines on object layers
                        if (obj.polygon && Array.isArray(obj.polygon) && obj.polygon.length) {
                            const poly = obj.polygon.map(p => ({ x: x + p.x, y: y + p.y }));
                            this.collisionObjects.push({ polygon: poly });
                        } else if (obj.polyline && Array.isArray(obj.polyline) && obj.polyline.length) {
                            const poly = obj.polyline.map(p => ({ x: x + p.x, y: y + p.y }));
                            this.collisionObjects.push({ polygon: poly });
                        } else if (width && height) {
                            this.collisionObjects.push({ x: x, y: y, width: width, height: height });
                        }
                    }
                }
            }
        }
        
    }

    checkCollision(rect1, rect2) {
        // If the second object is a polygon, use polygon-vs-rectangle test
        if (rect2.polygon && Array.isArray(rect2.polygon) && rect2.polygon.length) {
            return this.rectIntersectsPolygon(rect1, rect2.polygon);
        }

        // Fallback to axis-aligned rectangle collision
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Point-in-polygon using ray-casting
    pointInPolygon(px, py, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi + 0.0000001) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Check if two line segments intersect
    segmentsIntersect(a, b, c, d) {
        const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

        const o1 = orient(a, b, c);
        const o2 = orient(a, b, d);
        const o3 = orient(c, d, a);
        const o4 = orient(c, d, b);

        if (o1 === 0 && this.onSegment(a, c, b)) return true;
        if (o2 === 0 && this.onSegment(a, d, b)) return true;
        if (o3 === 0 && this.onSegment(c, a, d)) return true;
        if (o4 === 0 && this.onSegment(c, b, d)) return true;

        return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
    }

    onSegment(p, q, r) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
               q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }

    // Check rectangle vs polygon intersection
    rectIntersectsPolygon(rect, polygon) {
        // 1) Any rect corner inside polygon
        const corners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ];
        for (const c of corners) {
            if (this.pointInPolygon(c.x, c.y, polygon)) return true;
        }

        // 2) Any polygon vertex inside rect
        for (const p of polygon) {
            if (p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height) return true;
        }

        // 3) Any edge intersection between rect edges and polygon edges
        const rectEdges = [
            [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }],
            [{ x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }],
            [{ x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }],
            [{ x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y }]
        ];

        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i];
            const b = polygon[(i + 1) % polygon.length];
            for (const [r1, r2] of rectEdges) {
                if (this.segmentsIntersect(r1, r2, a, b)) return true;
            }
        }

        return false;
    }

    canMove(newX, newY) {
        // Character collision box is 50% smaller from the top (35% + 15% more)
        const collisionHeight = this.character.height * 0.5; // 50% of original height
        const topOffset = this.character.height * 0.5; // 50% offset from top
        
        // Remove 10% collision from the front side
        const collisionWidth = this.character.width * 0.9; // 90% of original width
        let collisionX = newX;
        if (this.character.facingRight) {
            // Facing right: remove 10% from right side (keep left edge same)
            collisionX = newX;
        } else {
            // Facing left: remove 10% from left side (move left edge 10% to the right)
            collisionX = newX + (this.character.width * 0.1);
        }
        
        const testRect = {
            x: collisionX,
            y: newY + topOffset, // Offset downward by 50%
            width: collisionWidth,
            height: collisionHeight
        };
        
        for (const obj of this.collisionObjects) {
            if (this.checkCollision(testRect, obj)) {
                return false;
            }
        }
        return true;
    }

    update(deltaTime) {
        // Update animations
        this.animationTime += deltaTime;
        this.updateAnimations(deltaTime);
        
        // Update screen shake
        this.updateScreenShake(deltaTime);
        
        // Update camera to follow character (center character on screen)
        this.updateCamera(deltaTime);
        
        // Update arrows
        this.updateArrows(deltaTime);
        this.updateEnemyArrows(deltaTime);
        
        // Update magic projectiles
        this.updateMagicProjectiles(deltaTime);
        
        // Update shield effect
        this.updateShieldEffect(deltaTime);
        
        // Update heavy attack effects
        this.updateHeavyAttackEffects(deltaTime);
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update damage popups
        this.updateDamagePopups(deltaTime);
        
        // Health regeneration - 1 HP per 2 seconds after 3 seconds of no damage
        if (!this.character.isDead && this.character.health < this.character.maxHealth) {
            this.character.lastDamageTime += deltaTime;
            
            // Only regen if no damage taken for 3+ seconds
            if (this.character.lastDamageTime >= 3.0) {
                this.character.regenTimer += deltaTime;
                
                // Heal 1 HP every 2 seconds
                if (this.character.regenTimer >= 2.0) {
                    this.character.regenTimer = 0;
                    this.character.health = Math.min(this.character.health + 1, this.character.maxHealth);
                    console.log('Health regenerated! HP:', this.character.health);
                }
            }
        }
        
        // Update attack cooldowns (separate for each ability)
        if (this.character.basicAttackCooldown > 0) {
            this.character.basicAttackCooldown -= deltaTime;
            if (this.character.basicAttackCooldown < 0) this.character.basicAttackCooldown = 0;
        }
        if (this.character.strongAttackCooldown > 0) {
            this.character.strongAttackCooldown -= deltaTime;
            if (this.character.strongAttackCooldown < 0) this.character.strongAttackCooldown = 0;
        }
        if (this.character.rangedAttackCooldown > 0) {
            this.character.rangedAttackCooldown -= deltaTime;
            if (this.character.rangedAttackCooldown < 0) this.character.rangedAttackCooldown = 0;
        }
        if (this.character.combinedAttackCooldown > 0) {
            this.character.combinedAttackCooldown -= deltaTime;
            if (this.character.combinedAttackCooldown < 0) this.character.combinedAttackCooldown = 0;
        }
        if (this.character.magicAttackCooldown > 0) {
            this.character.magicAttackCooldown -= deltaTime;
            if (this.character.magicAttackCooldown < 0) this.character.magicAttackCooldown = 0;
        }
        // Legacy attackCooldown (for compatibility)
        if (this.character.attackCooldown > 0) {
            this.character.attackCooldown -= deltaTime;
            if (this.character.attackCooldown < 0) this.character.attackCooldown = 0;
        }
        
        // Update attack timer and check melee damage
        if (this.character.attackTimer > 0) {
            this.character.attackTimer -= deltaTime;
            
            // Check melee attack damage (only for basic and strong attacks, not ranged)
            if (this.character.weaponMode !== 'ranged' && 
                (this.character.attackType === 'basic' || this.character.attackType === 'strong')) {
                this.checkMeleeAttackDamage();
            }
            
            if (this.character.attackTimer <= 0) {
                this.character.attackType = null;
                // Reset animation frame when attack ends
                this.character.currentFrame = 0;
                this.character.frameTime = 0;
                if (this.character.lastMeleeHitFrame !== undefined) {
                    this.character.lastMeleeHitFrame = -1;
                }
            }
        }
        
        // Update dash cooldown
        if (this.character.dashCooldown > 0) {
            this.character.dashCooldown -= deltaTime;
            if (this.character.dashCooldown < 0) this.character.dashCooldown = 0;
        }
        
        // Update dash duration
        if (this.character.isDashing) {
            this.character.dashDuration -= deltaTime;
            if (this.character.dashDuration <= 0) {
                this.character.isDashing = false;
                this.character.dashDuration = 0;
                // Reset animation frame when dash ends
                this.character.currentFrame = 0;
                this.character.frameTime = 0;
            }
        }
        
        // Update hurt timer
        if (this.character.isHurt && this.character.hurtTimer > 0) {
            this.character.hurtTimer -= deltaTime;
            if (this.character.hurtTimer <= 0) {
                this.character.isHurt = false;
                this.character.hurtTimer = 0;
                this.character.currentFrame = 0;
                this.character.frameTime = 0;
                console.log('Hurt state ended, character can take damage again');
            }
        }
        
        // Handle character movement (disabled when dead only - can move while hurt)
        let moveX = 0;
        let moveY = 0;
        
        if (!this.character.isDead) {
            // Check for movement keys - arrow keys become 'arrowup', 'arrowdown', etc. when lowercased
            if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
            if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
            if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
            if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
        }
        
        // Handle dashing movement
        if (this.character.isDashing) {
            // During dash, move in dash direction
            const dashSpeed = this.character.dashSpeed * deltaTime;
            const dashX = this.character.dashDirection.x * dashSpeed;
            const dashY = this.character.dashDirection.y * dashSpeed;
            
            const newDashX = this.character.x + dashX;
            const newDashY = this.character.y + dashY;
            
            // Check collision and move
            if (this.canMove(newDashX, this.character.y)) {
                this.character.x = newDashX;
            }
            if (this.canMove(this.character.x, newDashY)) {
                this.character.y = newDashY;
            }
            
            // Don't process normal movement during dash
            this.character.isMoving = false;
        } else {
            // Normal movement
            // Update facing direction based on horizontal movement
            if (moveX > 0) {
                this.character.facingRight = true;
            } else if (moveX < 0) {
                this.character.facingRight = false;
            }
            
            // Update movement state
            this.character.isMoving = (moveX !== 0 || moveY !== 0);
            
            // Reset animation frame when switching between idle and running
            if (this.character.isMoving && !this.character.wasMoving) {
                this.character.currentFrame = 0;
                this.character.frameTime = 0;
            } else if (!this.character.isMoving && this.character.wasMoving) {
                this.character.currentFrame = 0;
                this.character.frameTime = 0;
            }
            this.character.wasMoving = this.character.isMoving;
            
            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.707;
                moveY *= 0.707;
            }
            
            // Store movement direction for dash and shooting
            if (moveX !== 0 || moveY !== 0) {
                this.character.lastMoveDirection.x = moveX;
                this.character.lastMoveDirection.y = moveY;
                // Update shoot direction for ranged attacks
                if (this.character.weaponMode === 'ranged') {
                    const len = Math.sqrt(moveX * moveX + moveY * moveY);
                    if (len > 0) {
                        this.character.shootDirection.x = moveX / len;
                        this.character.shootDirection.y = moveY / len;
                    }
                }
            }
            
            // Calculate new position
            const speed = this.character.speed * deltaTime;
            const newX = this.character.x + moveX * speed;
            const newY = this.character.y + moveY * speed;
            
            // Check collision and move
            if (this.canMove(newX, this.character.y)) {
                this.character.x = newX;
            }
            if (this.canMove(this.character.x, newY)) {
                this.character.y = newY;
            }
        }
        
        // Update camera to follow character (center character on screen)
        this.updateCamera(deltaTime);
    }
    
    updateCamera(deltaTime) {
        // Center character on screen (accounting for character center, not top-left)
        // Character position (x, y) is the top-left corner of the character
        const charCenterX = this.character.x + this.character.width / 2;
        const charCenterY = this.character.y + this.character.height / 2;
        
        // Calculate camera position to center character perfectly
        // Camera position represents the top-left of the viewport
        // To center character: camera.x = charCenterX - canvas.width/2
        let desiredCameraX = charCenterX - this.canvas.width / 2;
        let desiredCameraY = charCenterY - this.canvas.height / 2;
        
        // Apply camera bounds if they exist (from mobile-game.html override)
        if (this.mapBounds) {
            const zoom = this.cameraZoom || 1.0;
            const viewWidth = this.canvas.width / zoom;
            const viewHeight = this.canvas.height / zoom;
            
            const bounds = this.mapBounds;
            const minCameraX = bounds.minX;
            const maxCameraX = Math.max(minCameraX, bounds.maxX - viewWidth);
            const minCameraY = bounds.minY;
            const maxCameraY = Math.max(minCameraY, bounds.maxY - viewHeight);
            
            // Clamp camera position to stay within bounds
            desiredCameraX = Math.max(minCameraX, Math.min(maxCameraX, desiredCameraX));
            desiredCameraY = Math.max(minCameraY, Math.min(maxCameraY, desiredCameraY));
        }
        
        // Instant camera follow for perfect centering (no smoothing lag)
        this.camera.x = desiredCameraX;
        this.camera.y = desiredCameraY;
    }

    async loadCharacterSprite() {
        // Load idle sprite
        const idlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.spriteImage = img;
                this.character.spriteLoaded = true;
                console.log('Character idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character idle sprite');
                this.character.spriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Idle-J4T6gkRUtRpzg8jigczL8H5k41RAQY.webp?lJVD';
        });
        
        // Load running sprite
        const runPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.runSpriteImage = img;
                this.character.runSpriteLoaded = true;
                console.log('Character run sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character run sprite');
                this.character.runSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Run-5JMlMcx7edYVszbUC0ZxX3aZekDtI5.webp?TLPP';
        });
        
        // Load dash sprite
        const dashPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.dashSpriteImage = img;
                this.character.dashSpriteLoaded = true;
                console.log('Character dash sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character dash sprite');
                this.character.dashSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Jump-axPSAGFJqAX6243XRtdfI7EQ96rOtM.webp?fa4i';
        });
        
        // Load static attack sprite
        const attackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.attackSpriteImage = img;
                this.character.attackSpriteLoaded = true;
                console.log('Character attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character attack sprite');
                this.character.attackSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Attack1-lWO3eSbQldFEdMBKPu3YfuQUXm65kA.webp?tGsg';
        });
        
        // Load running attack sprite
        const runAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.runAttackSpriteImage = img;
                this.character.runAttackSpriteLoaded = true;
                console.log('Character run attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character run attack sprite');
                this.character.runAttackSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/RunAttack1-vhl1Qo6byMNkXzHrQNHz3BxjgBb7EL.webp?mO50';
        });
        
        // Load static strong attack sprite
        const strongAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.strongAttackSpriteImage = img;
                this.character.strongAttackSpriteLoaded = true;
                console.log('Character strong attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character strong attack sprite');
                this.character.strongAttackSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Attack2-6KbplcAkD5hMoQTdQYkwc9DOCDGMCh.webp?Vdi1';
        });
        
        // Load running strong attack sprite
        const runStrongAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.runStrongAttackSpriteImage = img;
                this.character.runStrongAttackSpriteLoaded = true;
                console.log('Character run strong attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character run strong attack sprite');
                this.character.runStrongAttackSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/RunAttack2-rjMT6SBJrx99288prINeqLhLLu3krV.webp?xiKY';
        });
        
        // Load ranged sprites
        const rangedIdlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedSpriteImage = img;
                this.character.rangedSpriteLoaded = true;
                console.log('Character ranged idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character ranged idle sprite');
                this.character.rangedSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Idle-anJROq1R0R9gWgdSFSfCAXqO6v1NMY.webp?chV6';
        });
        
        const rangedRunPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedRunSpriteImage = img;
                this.character.rangedRunSpriteLoaded = true;
                console.log('Character ranged run sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character ranged run sprite');
                this.character.rangedRunSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Run-q2PfqOwX8fXL1lok0LAPpalZgc4mgh.webp?RG6k';
        });
        
        const rangedDashPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedDashSpriteImage = img;
                this.character.rangedDashSpriteLoaded = true;
                console.log('Character ranged dash sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character ranged dash sprite');
                this.character.rangedDashSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Jump-sYQ1Yb9Dxddv4p9Joipfyo3DziNepV.webp?ivZV';
        });
        
        // Load ranged attack sprites
        const rangedAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedAttackSpriteImage = img;
                this.character.rangedAttackSpriteLoaded = true;
                console.log('Character ranged attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character ranged attack sprite');
                this.character.rangedAttackSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Attack-Iz5GKcdP2v7d8PYjZgmEhAA7YithRw.webp?OqMc';
        });
        
        const rangedRunAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedRunAttackSpriteImage = img;
                this.character.rangedRunAttackSpriteLoaded = true;
                console.log('Character ranged run attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character ranged run attack sprite');
                this.character.rangedRunAttackSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/RunAttack-5IwQSzAPsKNzVYHkZGC4Ml3H3Kr8BT.webp?US3P';
        });
        
        // Load bow sprite (left/right)
        const bowPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.bowSpriteImage = img;
                this.character.bowSpriteLoaded = true;
                console.log('Character bow sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character bow sprite');
                this.character.bowSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/3-VZAm8kdGi3ihvjF6vy5TgkwNzDYsEI.webp?FvXC';
        });
        
        // Load bow up sprite (for shooting upwards)
        const bowUpPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.bowUpSpriteImage = img;
                this.character.bowUpSpriteLoaded = true;
                console.log('Character bow up sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character bow up sprite');
                this.character.bowUpSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/1-5nTFFQLBy3AY5APYy0nzj7tWJzGHlp.webp?R5ZK';
        });
        
        // Load bow down sprite (for shooting downwards)
        const bowDownPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.bowDownSpriteImage = img;
                this.character.bowDownSpriteLoaded = true;
                console.log('Character bow down sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load character bow down sprite');
                this.character.bowDownSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/4-Rwgh886tKisAZ1jDYolJbJOtQinveb.webp?e2A7';
        });
        
        // Load arrow sprites
        const arrowDownPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.arrowDownSprite = img;
                console.log('Arrow down sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load arrow down sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Arrow%20bottom-R4GkF5FTDMVDUzbCPuqxHnt2ujrBHC.webp?FfbV';
        });
        
        const arrowLeftPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.arrowLeftSprite = img;
                console.log('Arrow left sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load arrow left sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Arrow%20Left-ASQM9c21GNKJoJdfwPC4yCQY79qNvC.webp?kndk';
        });
        
        // Load diagonal arrow sprites
        const arrowDiagonalRightPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.arrowDiagonalRightSprite = img;
                console.log('Arrow diagonal right sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load arrow diagonal right sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Arrows%20diagonal%20right-X0Q5z0p7EikEzY24ST3vGQlQJvRe40.webp?OI41';
        });
        
        const arrowDiagonalLeftPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.arrowDiagonalLeftSprite = img;
                console.log('Arrow diagonal left sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load arrow diagonal left sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Arrows%20diagonal%20Left-4E4LY40Dd4FkoYycUbD5eMMDrxDlNM.webp?OAkP';
        });
        
        // Set arrowSpritesLoaded after all arrow promises complete
        Promise.all([arrowDownPromise, arrowLeftPromise, arrowDiagonalRightPromise, arrowDiagonalLeftPromise]).then(() => {
            this.arrowSpritesLoaded = true;
            console.log('✓ All arrow sprites loaded!');
        });
        
        // Load enemy sprites
        const enemyIdlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.enemyIdleSprite = img;
                console.log('Enemy idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load enemy idle sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Archer%20idle-l2KNaRDKzNbakLgPFPrKyKfy3y5k72.webp?IxJt';
        });
        
        const enemyMovePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.enemyMoveSprite = img;
                console.log('Enemy move sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load enemy move sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Orc_Archer_01_Move_6x1-vNpus0fMS36QrrXtYGBIvxFK0e1Qu5.webp?dcPr';
        });
        
        const enemyAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.enemyAttackSprite = img;
                this.enemySpritesLoaded = true;
                console.log('Enemy attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load enemy attack sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Orc_Archer_01_ATK_Full_18x1-DhuMg4Wkwj5JsadK1Icv2liz8ddZsY.webp?Y5EN';
        });
        
        // Load Yellow Knight sprites
        const yellowKnightIdlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowKnightIdleSprite = img;
                console.log('Yellow Knight idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Knight idle sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Warrior_Idle-FvE7y8fBsuFgl0DoeYMZf7guvI9Vfe.webp?6Mhk';
        });
        
        const yellowKnightMovePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowKnightMoveSprite = img;
                console.log('Yellow Knight move sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Knight move sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Warrior_Run-MFAb9kjv5ugyno5ACx5fO6Lx5yXIbW.webp?537K';
        });
        
        const yellowKnightAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowKnightAttackSprite = img;
                console.log('Yellow Knight attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Knight attack sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Warrior_Attack1-1IHJL3j66YRaM0637Lt5ZKmB9xx7mJ.webp?Il9p';
        });
        
        const yellowKnightBlockPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowKnightBlockSprite = img;
                this.yellowKnightSpritesLoaded = true;
                console.log('Yellow Knight block sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Knight block sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Warrior_Guard-FzXTZVQk753QDnW55uTjREotNShAcL.webp?nX2f';
        });
        
        // Load Yellow Archer sprites
        const yellowArcherIdlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowArcherIdleSprite = img;
                console.log('Yellow Archer idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Archer idle sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Archer_Idle-tWb3o2zXAhOPShrGvNBwqH7cdiAfjE.webp?eMHf';
        });
        
        const yellowArcherRunPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowArcherRunSprite = img;
                console.log('Yellow Archer run sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Archer run sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Archer_Run-6ewjh625xm5NuNURSAMZ3lNSFQOk9C.webp?ZuST';
        });
        
        const yellowArcherShootPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.yellowArcherShootSprite = img;
                this.yellowArcherSpritesLoaded = true;
                console.log('Yellow Archer shoot sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Yellow Archer shoot sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Archer_Shoot-gc4ik9PYh2jN8jPSh7OdoI1gtPTPP9.webp?dTx2';
        });
        
        // Load Blue Golem Boss sprites
        const blueGolemIdlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.blueGolemIdleSprite = img;
                console.log('Blue Golem idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Blue Golem idle sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Golem_1_idle-MaO35NcxIYj8jKsY0Fo0J2zLjCytRt.webp?R1yn';
        });
        
        const blueGolemWalkPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.blueGolemWalkSprite = img;
                console.log('Blue Golem walk sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Blue Golem walk sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Golem_1_walk-rurp4TVczrHfEZWTtbRel1hbIHlZM3.webp?9SLF';
        });
        
        const blueGolemAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.blueGolemAttackSprite = img;
                console.log('Blue Golem attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Blue Golem attack sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Golem_1_attack-m2lLFHeW4g2OXDr04tfc0Fper14hky.webp?tLHt';
        });
        
        const blueGolemDiePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.blueGolemDieSprite = img;
                console.log('Blue Golem die sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Blue Golem die sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Golem_1_die-T4Yk1dkvuOMVGrqgj2DE57PALx2VTV.webp?IDSG';
        });
        
        const blueGolemHurtPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.blueGolemHurtSprite = img;
                this.blueGolemSpritesLoaded = true;
                console.log('Blue Golem hurt sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Blue Golem hurt sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Golem_1_hurt-7TvWU65FdVr1EDo6C0uXwF2ZXb4wtx.webp?QefA';
        });
        
        // Load Fire Splitters spell sprite (128x64 per frame, 6 frames: 5 in row 1, 1 in row 2)
        const fireSplittersPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.fireSplittersSprite = img;
                this.fireSplittersSpriteLoaded = true;
                console.log('Fire Splitters sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Fire Splitters sprite');
                this.fireSplittersSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/sprite-sheet-UUgCnNthdAGSfzJ0kSnmwSnplyfcLj.webp?bIDC';
        });
        
        // Load Shield spell sprite (128x128 per frame, 15 frames: 3 rows x 5 frames per row)
        const shieldPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.shieldSprite = img;
                this.shieldSpriteLoaded = true;
                console.log('Shield sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Shield sprite');
                this.shieldSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/sprite-sheet-RE2b2Gd9RxYxZV2M4Yi7I839GRd19C.webp?3M4Z';
        });
        
        // Load Heavy Attack Effect sprite (5 frames, 192x128 per frame)
        const heavyAttackEffectPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.heavyAttackEffectSprite = img;
                this.heavyAttackEffectSpriteLoaded = true;
                console.log('Heavy Attack Effect sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Heavy Attack Effect sprite');
                this.heavyAttackEffectSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Heavy%20attack%20animation-ocNWKM87cntm5WRLGB8etXlofrI85k.webp?DJzS';
        });
        
        // Load Orc Barbarian sprites
        const orcBarbarianMovePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.orcBarbarianMoveSprite = img;
                console.log('Orc Barbarian move sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Orc Barbarian move sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Orc_Barbare_02_Move_5x1-BqZLeK39GElu0ej1khyzxaFLmsANbr.webp?AgSz';
        });
        
        const orcBarbarianAttackPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.orcBarbarianAttackSprite = img;
                this.orcBarbarianSpritesLoaded = true;
                console.log('Orc Barbarian attack sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Orc Barbarian attack sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Orc_Barbare_02_ATK_Full_12x1-gM4vwcDtkEd7x8l36fef7AVZsKocsZ.webp?Q97X';
        });
        
        // Load Quest NPC (Monk) idle sprite
        const questNPCIdlePromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.questNPCIdleSprite = img;
                this.questNPCSpritesLoaded = true;
                console.log('Quest NPC (Monk) idle sprite loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load Quest NPC (Monk) idle sprite');
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Monk%20idle-v5XsjjNB8pjvBSSPnPfZrC4pjgNofz.webp?eaNU';
        });
        
        // Load health bar sprite (using a simple health bar image)
        // Health bar is drawn programmatically, so we don't need to load an external sprite
        const healthBarPromise = new Promise((resolve) => {
            // Health bar is drawn programmatically in drawPlayerHealthBar, so we just resolve immediately
            this.healthBarSpriteLoaded = false; // We don't use a sprite, we draw it programmatically
            resolve();
        });
        
        // Load hurt and death sprites
        const hurtPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.hurtSpriteImage = img;
                this.character.hurtSpriteLoaded = true;
                console.log('Hurt sprite (melee) loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load hurt sprite (melee)');
                this.character.hurtSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Hurt-vDhT7t4m5VaJbLGasStltzTbzIPy0n.webp?SVbP';
        });
        
        const deathPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.deathSpriteImage = img;
                this.character.deathSpriteLoaded = true;
                console.log('Death sprite (melee) loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load death sprite (melee)');
                this.character.deathSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Death-FqxJCS1loudnLZJpaK6F0WihUdV45w.webp?XyCQ';
        });
        
        const rangedHurtPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedHurtSpriteImage = img;
                this.character.rangedHurtSpriteLoaded = true;
                console.log('Hurt sprite (ranged) loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load hurt sprite (ranged)');
                this.character.rangedHurtSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Hurt-DMHlHOehk9G3iMpic4h3y7BVKNVqK9.webp?HOrd';
        });
        
        const rangedDeathPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.character.rangedDeathSpriteImage = img;
                this.character.rangedDeathSpriteLoaded = true;
                console.log('Death sprite (ranged) loaded:', img.width, 'x', img.height);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load death sprite (ranged)');
                this.character.rangedDeathSpriteLoaded = false;
                resolve();
            };
            img.src = 'https://remix.gg/blob/616dcc4b-4e83-4689-99e6-66e0467fc181/Death-5FSp7xo01oiokv2eH6IOrNmxQzqMGl.webp?AeeY';
        });
        
        await Promise.all([idlePromise, runPromise, dashPromise, attackPromise, runAttackPromise, strongAttackPromise, runStrongAttackPromise, rangedIdlePromise, rangedRunPromise, rangedDashPromise, rangedAttackPromise, rangedRunAttackPromise, bowPromise, bowUpPromise, bowDownPromise, arrowDownPromise, arrowLeftPromise, arrowDiagonalRightPromise, arrowDiagonalLeftPromise, enemyIdlePromise, enemyMovePromise, enemyAttackPromise, healthBarPromise, hurtPromise, deathPromise, rangedHurtPromise, rangedDeathPromise, yellowKnightIdlePromise, yellowKnightMovePromise, yellowKnightAttackPromise, yellowKnightBlockPromise, orcBarbarianMovePromise, orcBarbarianAttackPromise, questNPCIdlePromise, yellowArcherIdlePromise, yellowArcherRunPromise, yellowArcherShootPromise, blueGolemIdlePromise, blueGolemWalkPromise, blueGolemAttackPromise, blueGolemDiePromise, blueGolemHurtPromise, fireSplittersPromise, shieldPromise, heavyAttackEffectPromise]);
    }

    updateAnimations(deltaTime) {
        // Update character animation (idle, running, dashing, attacking, hurt, or death)
        const isRanged = this.character.weaponMode === 'ranged';
        
        // Handle hurt and death animations first (they take priority)
        if (this.character.isDead) {
            // Death animation (50% slower)
            const deathSpriteLoaded = isRanged ? this.character.rangedDeathSpriteLoaded : this.character.deathSpriteLoaded;
            if (deathSpriteLoaded) {
                this.character.frameTime += deltaTime;
                const frameDuration = 0.2; // 8 frames * 0.2s = 1.6s total (50% slower)
                if (this.character.frameTime >= frameDuration) {
                    this.character.frameTime = 0;
                    if (this.character.currentFrame < this.character.deathFrames - 1) {
                        this.character.currentFrame++;
                    }
                    // Stay on last frame when animation completes
                }
            }
            return; // Don't update other animations when dead
        }
        
        if (this.character.isHurt) {
            // Hurt animation
            const hurtSpriteLoaded = isRanged ? this.character.rangedHurtSpriteLoaded : this.character.hurtSpriteLoaded;
            if (hurtSpriteLoaded) {
                this.character.frameTime += deltaTime;
                const frameDuration = 0.1; // 4 frames * 0.1s
                if (this.character.frameTime >= frameDuration) {
                    this.character.frameTime = 0;
                    this.character.currentFrame = (this.character.currentFrame + 1) % this.character.hurtFrames;
                }
            }
            return; // Don't update other animations when hurt
        }
        
        const hasSprites = isRanged ? 
            (this.character.rangedSpriteLoaded || this.character.rangedRunSpriteLoaded || this.character.rangedDashSpriteLoaded ||
             this.character.rangedAttackSpriteLoaded || this.character.rangedRunAttackSpriteLoaded || this.character.bowSpriteLoaded) :
            (this.character.spriteLoaded || this.character.runSpriteLoaded || this.character.dashSpriteLoaded || 
             this.character.attackSpriteLoaded || this.character.runAttackSpriteLoaded ||
             this.character.strongAttackSpriteLoaded || this.character.runStrongAttackSpriteLoaded);
        
        if (hasSprites) {
            this.character.frameTime += deltaTime;
            
            // Check if attacking
            const isMeleeAttacking = !isRanged && (this.character.attackType === 'basic' || this.character.attackType === 'strong') && this.character.attackTimer > 0;
            const isRangedAttacking = isRanged && this.character.attackType === 'strong' && this.character.attackTimer > 0; // Strong attack becomes ranged attack
            const isAttacking = isMeleeAttacking || isRangedAttacking;
            const isBasicAttack = this.character.attackType === 'basic' && this.character.attackTimer > 0;
            const isStrongAttack = this.character.attackType === 'strong' && this.character.attackTimer > 0;
            
            if (this.character.isDashing) {
                // Dash animation
                const dashFrames = isRanged ? this.character.rangedDashFrames : this.character.dashFrames;
                const dashDuration = this.character.dashFrameDuration;
                if (this.character.frameTime >= dashDuration) {
                    this.character.frameTime = 0;
                    this.character.currentFrame = (this.character.currentFrame + 1) % dashFrames;
                }
            } else if (isAttacking) {
                // Attack animation (static or running)
                if (isRangedAttacking) {
                    // Ranged attack animation
                    if (this.character.isMoving) {
                        // Running ranged attack
                        if (this.character.frameTime >= this.character.runAttackFrameDuration) {
                            this.character.frameTime = 0;
                            this.character.currentFrame = (this.character.currentFrame + 1) % this.character.rangedRunAttackFrames;
                        }
                    } else {
                        // Static ranged attack
                        if (this.character.frameTime >= this.character.attackFrameDuration) {
                            this.character.frameTime = 0;
                            this.character.currentFrame = (this.character.currentFrame + 1) % this.character.rangedAttackFrames;
                        }
                    }
                } else if (isMeleeAttacking) {
                    // Melee attack animation
                    if (this.character.isMoving) {
                        // Running attack animation
                        if (isStrongAttack) {
                            // Running strong attack
                            if (this.character.frameTime >= this.character.runStrongAttackFrameDuration) {
                                this.character.frameTime = 0;
                                this.character.currentFrame = (this.character.currentFrame + 1) % this.character.runStrongAttackFrames;
                            }
                        } else {
                            // Running basic attack
                            if (this.character.frameTime >= this.character.runAttackFrameDuration) {
                                this.character.frameTime = 0;
                                this.character.currentFrame = (this.character.currentFrame + 1) % this.character.runAttackFrames;
                            }
                        }
                    } else {
                        // Static attack animation
                        if (isStrongAttack) {
                            // Static strong attack
                            if (this.character.frameTime >= this.character.strongAttackFrameDuration) {
                                this.character.frameTime = 0;
                                this.character.currentFrame = (this.character.currentFrame + 1) % this.character.strongAttackFrames;
                            }
                        } else {
                            // Static basic attack
                            if (this.character.frameTime >= this.character.attackFrameDuration) {
                                this.character.frameTime = 0;
                                this.character.currentFrame = (this.character.currentFrame + 1) % this.character.attackFrames;
                            }
                        }
                    }
                }
            } else if (this.character.isMoving) {
                // Running animation
                const runFrames = isRanged ? this.character.rangedRunFrames : this.character.runFrames;
                const runDuration = this.character.runFrameDuration;
                if (this.character.frameTime >= runDuration) {
                    this.character.frameTime = 0;
                    this.character.currentFrame = (this.character.currentFrame + 1) % runFrames;
                }
            } else {
                // Idle animation
                const idleFrames = isRanged ? this.character.rangedIdleFrames : this.character.idleFrames;
                const idleDuration = this.character.frameDuration;
                if (this.character.frameTime >= idleDuration) {
                    this.character.frameTime = 0;
                    this.character.currentFrame = (this.character.currentFrame + 1) % idleFrames;
                }
            }
        }
        
        // Update map tile animations
        for (const [tileId, anim] of this.mapLoader.animations) {
            anim.elapsed += deltaTime * 1000; // Convert to milliseconds
            
            if (anim.elapsed >= anim.frames[anim.currentFrame].duration) {
                anim.elapsed = 0;
                anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
            }
        }
        
        // Update Quest NPC animation
        if (this.questNPC && this.questNPCSpritesLoaded) {
            this.questNPC.frameTime += deltaTime;
            if (this.questNPC.frameTime >= this.questNPC.frameDuration) {
                this.questNPC.frameTime = 0;
                this.questNPC.currentFrame = (this.questNPC.currentFrame + 1) % this.questNPC.idleFrames;
            }
        }
        
        // Update Boss Quest NPC animation
        if (this.bossQuestNPC && this.questNPCSpritesLoaded) {
            this.bossQuestNPC.frameTime += deltaTime;
            if (this.bossQuestNPC.frameTime >= this.bossQuestNPC.frameDuration) {
                this.bossQuestNPC.frameTime = 0;
                this.bossQuestNPC.currentFrame = (this.bossQuestNPC.currentFrame + 1) % this.bossQuestNPC.idleFrames;
            }
        }
    }
    
    // Check if point (screen coordinates) is within NPC bounds
    checkNPCClick(screenX, screenY) {
        // Check boss quest NPC first
        if (this.bossQuestNPC && this.questNPCSpritesLoaded) {
            const npcX = this.bossQuestNPC.x - this.camera.x;
            const npcY = this.bossQuestNPC.y - this.camera.y;
            
            if (screenX >= npcX && screenX <= npcX + this.bossQuestNPC.width &&
                screenY >= npcY && screenY <= npcY + this.bossQuestNPC.height) {
                return 'bossQuestNPC';
            }
        }
        
        // Check main quest NPC
        if (this.questNPC && this.questNPCSpritesLoaded) {
            const npcX = this.questNPC.x - this.camera.x;
            const npcY = this.questNPC.y - this.camera.y;
            
            if (screenX >= npcX && screenX <= npcX + this.questNPC.width &&
                screenY >= npcY && screenY <= npcY + this.questNPC.height) {
                return 'questNPC';
            }
        }
        
        return false;
    }
    
    // Start NPC dialog
    startNPCDialog(npcType = 'questNPC') {
        const npc = npcType === 'bossQuestNPC' ? this.bossQuestNPC : this.questNPC;
        if (!npc || npc.isTalking) return;
        
        // If boss quest NPC and quest is completed, show completion dialog again
        if (npcType === 'bossQuestNPC' && this.bossQuest.completed) {
            npc.isTalking = true;
            npc.dialogIndex = 0;
            // Use completion dialog
            npc.currentDialogMessages = npc.completionDialogMessages;
            console.log('Boss Quest NPC completion dialog started');
            return;
        }
        
        // If boss quest NPC and boss is defeated but quest not completed, give reward
        if (npcType === 'bossQuestNPC' && this.bossQuest.bossDefeated && !this.bossQuest.completed) {
            // Give XP reward
            this.xpSystem.currentXP += 1000;
            console.log('+1000 XP from boss quest completion!');
            // Check for level up after adding XP
            this.checkLevelUp();
            this.bossQuest.completed = true;
            // Remove quest objective from UI since quest is completed
            this.removeQuestObjective(this.bossQuest.objectiveText);
            this.bossQuestNPC.showExclamation = false; // Hide exclamation after completion
            // Show completion dialog
            npc.isTalking = true;
            npc.dialogIndex = 0;
            npc.currentDialogMessages = npc.completionDialogMessages;
            console.log('Boss Quest completed!');
            return;
        }
        
        // If boss quest NPC and quest hasn't started yet, show initial dialog and start quest
        if (npcType === 'bossQuestNPC' && !this.bossQuest.started) {
            this.bossQuest.started = true;
            npc.isTalking = true;
            npc.showExclamation = false; // Hide exclamation point
            npc.dialogIndex = 0;
            npc.currentDialogMessages = npc.dialogMessages;
            console.log('Boss Quest NPC initial dialog started - quest started!');
            return;
        }
        
        npc.isTalking = true;
        npc.showExclamation = false; // Hide exclamation point
        npc.dialogIndex = 0;
        npc.currentDialogMessages = npc.dialogMessages;
        
        if (npcType === 'bossQuestNPC') {
            console.log('Boss Quest NPC dialog started');
        } else {
            console.log('NPC dialog started');
        }
    }
    
    // Advance to next dialog message or close dialog
    advanceDialog(npcType = 'questNPC') {
        const npc = npcType === 'bossQuestNPC' ? this.bossQuestNPC : this.questNPC;
        if (!npc || !npc.isTalking) return;
        
        const messages = npc.currentDialogMessages || npc.dialogMessages;
        
        npc.dialogIndex++;
        if (npc.dialogIndex >= messages.length) {
            // Dialog finished
            npc.isTalking = false;
            
            if (npcType === 'questNPC') {
                // Start main quest - show objective
                this.addQuestObjective("Main Quest: Save My Little Brother");
                console.log('Main quest started! Objective: Main Quest: Save My Little Brother');
            } else if (npcType === 'bossQuestNPC' && !this.bossQuest.completed && !this.bossQuest.bossDefeated) {
                // Start boss quest
                this.bossQuest.started = true;
                this.addQuestObjective(this.bossQuest.objectiveText);
                console.log('Boss quest started! Objective:', this.bossQuest.objectiveText);
            }
        }
    }

    getAnimatedTileId(gid) {
        const anim = this.mapLoader.animations.get(gid);
        if (anim) {
            return anim.frames[anim.currentFrame].tileid;
        }
        return gid;
    }
    
    // Helper function to draw rounded rectangles (polyfill for older browsers)
    drawRoundedRect(x, y, width, height, radius) {
        if (this.ctx.roundRect) {
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, width, height, radius);
        } else {
            // Manual rounded rectangle path
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
        }
    }

    drawTile(gid, x, y) {
        if (gid === 0) return;
        
        // Get animated tile ID if applicable
        const actualGid = this.getAnimatedTileId(gid);
        
        const tilesetInfo = this.mapLoader.getTilesetForTile(actualGid);
        if (!tilesetInfo) return;
        
        const { firstgid, tileset } = tilesetInfo;
        const localTileId = actualGid - firstgid;
        
        const tileWidth = tileset.tilewidth;
        const tileHeight = tileset.tileheight;
        const mapTileHeight = (this.mapLoader.mapData && this.mapLoader.mapData.tileheight) || this.tileSize;

        // If tileset tiles are taller than the map tile height, draw the image
        // offset upwards so the bottom of the tile aligns to the map grid cell.
        let destY = y;
        if (tileHeight > mapTileHeight) {
            destY = y - (tileHeight - mapTileHeight);
        }
        const columns = tileset.columns || Math.floor(tileset.imageWidth / tileWidth);
        
        const sourceX = (localTileId % columns) * tileWidth;
        const sourceY = Math.floor(localTileId / columns) * tileHeight;
        
        this.ctx.drawImage(
            tileset.image,
            sourceX, sourceY, tileWidth, tileHeight,
            x, destY, tileWidth, tileHeight
        );
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.mapLoader.mapData) return;
        const tileSize = this.tileSize;

        for (const layer of this.mapLoader.mapData.layers) {
            if (layer.type === 'tilelayer' && layer.visible !== false) {
                // Handle infinite chunks
                if (layer.chunks) {
                    for (const chunk of layer.chunks) {
                        const chunkX = chunk.x * tileSize;
                        const chunkY = chunk.y * tileSize;

                        for (let i = 0; i < chunk.data.length; i++) {
                            const gid = chunk.data[i];
                            if (gid !== 0) {
                                const x = (i % chunk.width) * tileSize + chunkX - this.camera.x;
                                const y = Math.floor(i / chunk.width) * tileSize + chunkY - this.camera.y;

                                // Only render tiles in view
                                if (x > -tileSize && x < this.canvas.width + tileSize &&
                                    y > -tileSize && y < this.canvas.height + tileSize) {
                                    this.drawTile(gid, x, y);
                                }
                            }
                        }
                    }
                } else if (layer.data) {
                    // Regular layer
                    const width = layer.width || this.mapLoader.mapData.width;
                    const height = layer.height || this.mapLoader.mapData.height;

                    for (let i = 0; i < layer.data.length; i++) {
                        const gid = layer.data[i];
                        if (gid !== 0) {
                            const x = (i % width) * tileSize - this.camera.x;
                            const y = Math.floor(i / width) * tileSize - this.camera.y;

                            if (x > -tileSize && x < this.canvas.width + tileSize &&
                                y > -tileSize && y < this.canvas.height + tileSize) {
                                this.drawTile(gid, x, y);
                            }
                        }
                    }
                }
            } else if (layer.type === 'objectgroup' && layer.visible !== false) {
                // Draw object layer (towers, houses, buildings, etc.)
                if (layer.objects && Array.isArray(layer.objects)) {
                    // Debug: log all object layers (only once per frame, use a flag)
                    if (!this._objectLayerDebugLogged) {
                        console.log(`=== Object Layers Found ===`);
                        for (const l of this.mapLoader.mapData.layers) {
                            if (l.type === 'objectgroup') {
                                console.log(`  Layer: "${l.name}" - ${l.objects ? l.objects.length : 0} objects, visible: ${l.visible !== false}`);
                            }
                        }
                        this._objectLayerDebugLogged = true;
                    }
                    
                    for (const obj of layer.objects) {
                        // Skip spawn points and boss areas
                        if (layer.name && (
                            layer.name.toLowerCase().includes('spawn') ||
                            layer.name === 'Boss Level 1' ||
                            layer.name === 'Boss level 2' ||
                            layer.name === 'Boss Level 3' ||
                            layer.name === 'Final Boss Blue'
                        )) {
                            continue;
                        }
                        if (obj.name && obj.name.toLowerCase().includes('spawn')) continue;
                        
                        // Handle template instances - if object has template, use template's gid
                        let objGid = obj.gid;
                        if (!objGid && obj.template) {
                            // Template instance - would need to load template, but for now skip
                            continue;
                        }
                        
                        // Debug: log all objects with gid in bottom-left area (roughly x < 2000, y > mapHeight - 2000)
                        const mapHeight = (this.mapLoader.mapData && this.mapLoader.mapData.height * this.tileSize) || 0;
                        if (objGid && obj.x < 2000 && obj.y > mapHeight - 2000) {
                            const tilesetInfo = this.mapLoader.getTilesetForTile(objGid);
                            const tsName = tilesetInfo ? (tilesetInfo.tileset.name || 'unknown') : 'NO TILESET';
                            console.log(`  [${layer.name}] Object: name="${obj.name || 'unnamed'}", gid=${objGid}, pos=(${obj.x}, ${obj.y}), tileset="${tsName}"`);
                        }
                        
                        // Only draw objects that have a gid (tile objects like towers/houses)
                        if (objGid) {
                            let x = obj.x;
                            let y = obj.y;
                            let width = obj.width || 0;
                            let height = obj.height || 0;
                            
                            // Get tileset info for this gid
                            const tilesetInfo = this.mapLoader.getTilesetForTile(objGid);
                            if (tilesetInfo) {
                                const { firstgid, tileset } = tilesetInfo;
                                const localTileId = objGid - firstgid;
                                const tileWidth = tileset.tilewidth;
                                const tileHeight = tileset.tileheight;
                                const mapTileHeight = (this.mapLoader.mapData && this.mapLoader.mapData.tileheight) || this.tileSize;
                                
                                // Use tile dimensions if width/height not specified
                                if (!width) width = tileWidth;
                                if (!height) height = tileHeight;
                                
                                // Tiled places object y at the bottom, adjust to top-left for rendering
                                y = obj.y - height;
                                
                                // Calculate source position in tileset
                                const columns = tileset.columns || Math.floor(tileset.imageWidth / tileWidth);
                                const sourceX = (localTileId % columns) * tileWidth;
                                const sourceY = Math.floor(localTileId / columns) * tileHeight;
                                
                                // Calculate screen position
                                const screenX = x - this.camera.x;
                                const screenY = y - this.camera.y;
                                
                                // Only render if in view
                                if (screenX > -width && screenX < this.canvas.width + width &&
                                    screenY > -height && screenY < this.canvas.height + height) {
                                    // Draw the tile object
                                    this.ctx.drawImage(
                                        tileset.image,
                                        sourceX, sourceY, tileWidth, tileHeight,
                                        screenX, screenY, width, height
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Draw spawn point
        if (this.spawnPoint) {
            const spX = this.spawnPoint.x - this.camera.x;
            const spY = this.spawnPoint.y - this.camera.y;
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(spX, spY, this.spawnPoint.width || 64, this.spawnPoint.height || 64);
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            this.ctx.fillRect(spX, spY, this.spawnPoint.width || 64, this.spawnPoint.height || 64);
        }
        
        // Draw collision boxes (for debugging - can be toggled with 'b' or 'c')
        if (this.keys['b'] || this.keys['c']) {
            // Draw character collision box (50% smaller from top, 10% smaller from front)
            const charX = this.character.x - this.camera.x + this.cameraShake.x;
            const charY = this.character.y - this.camera.y + this.cameraShake.y;
            const collisionHeight = this.character.height * 0.5; // 50% of original height
            const topOffset = this.character.height * 0.5; // 50% offset from top
            const collisionWidth = this.character.width * 0.9; // 90% of original width
            let collisionX = charX;
            if (this.character.facingRight) {
                // Facing right: remove 10% from right side
                collisionX = charX;
            } else {
                // Facing left: remove 10% from left side
                collisionX = charX + (this.character.width * 0.1);
            }
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(collisionX, charY + topOffset, collisionWidth, collisionHeight);
            
            // Draw other collision objects
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 1;
            for (const obj of this.collisionObjects) {
                if (obj.polygon && Array.isArray(obj.polygon)) {
                    this.ctx.beginPath();
                    for (let i = 0; i < obj.polygon.length; i++) {
                        const p = obj.polygon[i];
                        const px = p.x - this.camera.x;
                        const py = p.y - this.camera.y;
                        if (i === 0) this.ctx.moveTo(px, py);
                        else this.ctx.lineTo(px, py);
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();
                } else {
                    const x = obj.x - this.camera.x;
                    const y = obj.y - this.camera.y;
                    this.ctx.strokeRect(x, y, obj.width, obj.height);
                }
            }
        }
        
        // Draw enemies
        if (this.enemies && this.enemies.length > 0) {
            let enemiesInView = 0;
            for (const enemy of this.enemies) {
                const enemyX = enemy.x - this.camera.x + this.cameraShake.x;
                const enemyY = enemy.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view (with larger margin to catch nearby enemies)
                if (enemyX > -enemy.width * 2 && enemyX < this.canvas.width + enemy.width * 2 &&
                    enemyY > -enemy.height * 2 && enemyY < this.canvas.height + enemy.height * 2) {
                    enemiesInView++;
                    
                    // Draw enemy sprite
                    let sprite = null;
                    let frameCount = 0;
                    let currentFrame = enemy.currentFrame;
                    let frameWidth = 74;
                    let frameHeight = 41;
                    
                    // Check for Blue Golem death FIRST (before generic death check)
                    if (enemy.type === 'blueGolem' && enemy.isDead && enemy.state === 'dying') {
                        frameWidth = 90;
                        frameHeight = 64;
                        if (this.blueGolemDieSprite) {
                            sprite = this.blueGolemDieSprite;
                            frameCount = enemy.dieFrames;
                        } else {
                            console.warn('Blue Golem die sprite not loaded!');
                        }
                    }
                    // Check if enemy is dead - use character death animation (last 4 frames) - for non-Blue Golem enemies
                    else if (enemy.isDead && enemy.state === 'dying' && this.character.deathSpriteLoaded) {
                        sprite = this.character.deathSpriteImage;
                        frameWidth = this.character.spriteFrameWidth || 42;
                        frameHeight = this.character.spriteFrameHeight || 42;
                        frameCount = 8; // Character death has 8 frames, we use last 4 (4-7)
                        // currentFrame is already set to 4-7 range in updateEnemies
                    } else if (enemy.type === 'yellowKnight' && this.yellowKnightSpritesLoaded) {
                        // Yellow Knight sprites (192x192 per frame, scaled to 100x100)
                        frameWidth = 192;
                        frameHeight = 192;
                        
                        if (enemy.state === 'blocking' && this.yellowKnightBlockSprite) {
                            sprite = this.yellowKnightBlockSprite;
                            frameCount = enemy.blockFrames;
                        } else if (enemy.state === 'attacking' && this.yellowKnightAttackSprite) {
                            sprite = this.yellowKnightAttackSprite;
                            frameCount = enemy.attackFrames;
                        } else if (enemy.state === 'moving' && this.yellowKnightMoveSprite) {
                            sprite = this.yellowKnightMoveSprite;
                            frameCount = enemy.moveFrames;
                        } else if (this.yellowKnightIdleSprite) {
                            sprite = this.yellowKnightIdleSprite;
                            frameCount = enemy.idleFrames;
                        }
                    } else if (enemy.type === 'yellowArcher' && this.yellowArcherSpritesLoaded) {
                        // Yellow Archer sprites (192x192 per frame, scaled to 140x140 like yellow knight)
                        frameWidth = 192;
                        frameHeight = 192;
                        
                        if (enemy.state === 'shooting' && this.yellowArcherShootSprite) {
                            sprite = this.yellowArcherShootSprite;
                            frameCount = enemy.shootFrames;
                        } else if (enemy.state === 'moving' && this.yellowArcherRunSprite) {
                            sprite = this.yellowArcherRunSprite;
                            frameCount = enemy.runFrames;
                        } else if (this.yellowArcherIdleSprite) {
                            sprite = this.yellowArcherIdleSprite;
                            frameCount = enemy.idleFrames;
                        }
                    } else if (enemy.type === 'blueGolem' && this.blueGolemSpritesLoaded) {
                        // Blue Golem Boss sprites (90x64 per frame, scaled to 176x126 - 196% of original)
                        frameWidth = 90;
                        frameHeight = 64;
                        
                        // Death state is already handled above, so skip it here
                        if (enemy.isHurt && enemy.hurtTimer > 0 && this.blueGolemHurtSprite) {
                            sprite = this.blueGolemHurtSprite;
                            frameCount = enemy.hurtFrames;
                        } else if (enemy.state === 'attacking' && this.blueGolemAttackSprite) {
                            sprite = this.blueGolemAttackSprite;
                            frameCount = enemy.attackFrames;
                        } else if (enemy.state === 'walking' && this.blueGolemWalkSprite) {
                            sprite = this.blueGolemWalkSprite;
                            frameCount = enemy.walkFrames;
                        } else if (this.blueGolemIdleSprite) {
                            sprite = this.blueGolemIdleSprite;
                            frameCount = enemy.idleFrames;
                        }
                    } else if (enemy.type === 'archer' && this.enemySpritesLoaded) {
                        // Archer sprites
                        frameWidth = 74;
                        frameHeight = 41;
                        
                        if (enemy.state === 'attacking' && this.enemyAttackSprite) {
                            sprite = this.enemyAttackSprite;
                            frameCount = enemy.attackFrames;
                        } else if (enemy.state === 'moving' && this.enemyMoveSprite) {
                            sprite = this.enemyMoveSprite;
                            frameCount = enemy.moveFrames;
                        } else if (this.enemyIdleSprite) {
                            sprite = this.enemyIdleSprite;
                            frameCount = enemy.idleFrames;
                        }
                    } else if (enemy.type === 'orcBarbarian' && this.orcBarbarianSpritesLoaded) {
                        // Orc Barbarian sprites (57x58 per frame for move, 58x57 for attack)
                        if (enemy.state === 'attacking' && this.orcBarbarianAttackSprite) {
                            sprite = this.orcBarbarianAttackSprite;
                            frameWidth = 58;
                            frameHeight = 57;
                            frameCount = enemy.attackFrames;
                        } else if (enemy.state === 'moving' && this.orcBarbarianMoveSprite) {
                            sprite = this.orcBarbarianMoveSprite;
                            frameWidth = 57;
                            frameHeight = 58;
                            frameCount = enemy.moveFrames;
                        } else if (this.orcBarbarianMoveSprite) {
                            // Use move sprite for idle (no separate idle sprite)
                            sprite = this.orcBarbarianMoveSprite;
                            frameWidth = 57;
                            frameHeight = 58;
                            frameCount = enemy.idleFrames;
                        }
                    }
                    
                    if (sprite) {
                        // Clamp currentFrame to valid range
                        if (currentFrame >= frameCount) {
                            currentFrame = frameCount - 1;
                        }
                        if (currentFrame < 0) {
                            currentFrame = 0;
                        }
                        
                        const sourceX = currentFrame * frameWidth;
                        const sourceY = 0;
                        
                        this.ctx.save();
                        
                        // Flip sprite if facing left
                        if (!enemy.facingRight) {
                            this.ctx.translate(enemyX + enemy.width, enemyY);
                            this.ctx.scale(-1, 1);
                            this.ctx.drawImage(
                                sprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                0, 0, enemy.width, enemy.height
                            );
                        } else {
                            this.ctx.drawImage(
                                sprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                enemyX, enemyY, enemy.width, enemy.height
                            );
                        }
                        
                        this.ctx.restore();
                        
                        // Draw cone attack indicator for Blue Golem when attacking
                        if (enemy.type === 'blueGolem' && enemy.state === 'attacking' && enemy.attackTimer > 0) {
                            const enemyCenterX = enemy.x + enemy.width / 2;
                            const enemyCenterY = enemy.y + enemy.height / 2;
                            const coneLength = enemy.coneAttackLength || 200;
                            const coneAngle = enemy.coneAttackAngle || Math.PI / 3; // 60 degrees
                            
                            // Calculate cone direction based on facing direction
                            const coneDirX = enemy.facingRight ? 1 : -1;
                            const coneDirY = 0;
                            
                            // Calculate cone start point (front of enemy)
                            const coneStartX = enemyCenterX + (enemy.width / 2) * coneDirX;
                            const coneStartY = enemyCenterY;
                            
                            // Calculate cone end points
                            const halfAngle = coneAngle / 2;
                            const cosHalf = Math.cos(halfAngle);
                            const sinHalf = Math.sin(halfAngle);
                            
                            // Rotate the direction vector
                            const leftX = coneDirX * cosHalf - coneDirY * sinHalf;
                            const leftY = coneDirX * sinHalf + coneDirY * cosHalf;
                            const rightX = coneDirX * cosHalf + coneDirY * sinHalf;
                            const rightY = -coneDirX * sinHalf + coneDirY * cosHalf;
                            
                            const coneEndLeftX = coneStartX + leftX * coneLength;
                            const coneEndLeftY = coneStartY + leftY * coneLength;
                            const coneEndRightX = coneStartX + rightX * coneLength;
                            const coneEndRightY = coneStartY + rightY * coneLength;
                            
                            // Convert to screen coordinates
                            const screenStartX = coneStartX - this.camera.x + this.cameraShake.x;
                            const screenStartY = coneStartY - this.camera.y + this.cameraShake.y;
                            const screenEndLeftX = coneEndLeftX - this.camera.x + this.cameraShake.x;
                            const screenEndLeftY = coneEndLeftY - this.camera.y + this.cameraShake.y;
                            const screenEndRightX = coneEndRightX - this.camera.x + this.cameraShake.x;
                            const screenEndRightY = coneEndRightY - this.camera.y + this.cameraShake.y;
                            
                            // Draw cone with semi-transparent red/orange color
                            this.ctx.save();
                            this.ctx.globalAlpha = 0.4; // Semi-transparent
                            this.ctx.fillStyle = '#ff4444'; // Red-orange color
                            this.ctx.beginPath();
                            this.ctx.moveTo(screenStartX, screenStartY);
                            this.ctx.lineTo(screenEndLeftX, screenEndLeftY);
                            this.ctx.lineTo(screenEndRightX, screenEndRightY);
                            this.ctx.closePath();
                            this.ctx.fill();
                            
                            // Draw cone outline
                            this.ctx.globalAlpha = 0.8;
                            this.ctx.strokeStyle = '#ff0000'; // Bright red outline
                            this.ctx.lineWidth = 3;
                            this.ctx.stroke();
                            this.ctx.restore();
                        }
                    } else {
                        // Fallback: draw colored rectangle
                        this.ctx.fillStyle = enemy.color || '#ff00ff';
                        this.ctx.fillRect(enemyX, enemyY, enemy.width, enemy.height);
                    }
                    
                    // Draw health bar above enemy (25% smaller) - only if not dead
                    if (!enemy.isDead && enemy.health !== undefined && enemy.maxHealth !== undefined) {
                        const barWidth = enemy.width * 0.75; // 25% smaller
                        const barHeight = 3; // Also slightly thinner
                        const barX = enemyX + (enemy.width - barWidth) / 2; // Centered
                        const barY = enemyY - 10; // 10 pixels above enemy
                        
                        // Background (red)
                        this.ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
                        this.ctx.fillRect(barX, barY, barWidth, barHeight);
                        
                        // Health (green)
                        const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
                        this.ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
                        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
                        
                        // Border
                        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
                    }
                }
            }
            // Debug: log enemies drawn (only once per second)
            if (!this._lastEnemyDrawLog || Date.now() - this._lastEnemyDrawLog > 1000) {
                if (enemiesInView > 0) {
                    console.log(`Drawing ${enemiesInView} enemies in view (total: ${this.enemies.length})`);
                } else {
                    console.warn(`⚠ No enemies in view! Camera: (${this.camera.x}, ${this.camera.y}), Character: (${this.character.x}, ${this.character.y})`);
                }
                this._lastEnemyDrawLog = Date.now();
            }
        }
        
        // Draw enemy arrows
        if (this.enemyArrows && this.enemyArrows.length > 0) {
            for (const arrow of this.enemyArrows) {
                const arrowX = arrow.x - this.camera.x + this.cameraShake.x;
                const arrowY = arrow.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view
                if (arrowX > -arrow.width * 2 && arrowX < this.canvas.width + arrow.width * 2 &&
                    arrowY > -arrow.height * 2 && arrowY < this.canvas.height + arrow.height * 2) {
                    
                    this.ctx.save();
                    this.ctx.translate(arrowX + arrow.width / 2, arrowY + arrow.height / 2);
                    
                    // Apply flips based on arrow properties
                    let scaleX = 1;
                    let scaleY = 1;
                    
                    if (arrow.flipHorizontal) {
                        scaleX = -1;
                    }
                    if (arrow.flipVertical) {
                        scaleY = -1;
                    }
                    
                    // Legacy support for old arrow format
                    if (arrow.flipHorizontal === undefined && arrow.flipVertical === undefined) {
                        if (arrow.shootingUp) {
                            scaleY = -1;
                        } else if (!arrow.shootingLeft) {
                            scaleX = -1;
                        }
                    }
                    
                    if (scaleX !== 1 || scaleY !== 1) {
                        this.ctx.scale(scaleX, scaleY);
                    }
                    
                    // Draw arrow sprite (check if sprite exists)
                    if (arrow.sprite) {
                        this.ctx.drawImage(
                            arrow.sprite,
                            0, 0, arrow.sprite.width, arrow.sprite.height,
                            -arrow.width / 2, -arrow.height / 2,
                            arrow.width, arrow.height
                        );
                    } else {
                        // Fallback: draw colored rectangle if sprite not loaded
                        this.ctx.fillStyle = '#ff0000';
                        this.ctx.fillRect(-arrow.width / 2, -arrow.height / 2, arrow.width, arrow.height);
                        console.warn('Enemy arrow sprite is null! Drawing fallback rectangle.');
                    }
                    
                    this.ctx.restore();
                }
            }
        }
        
        // Draw damage popups
        if (this.damagePopups && this.damagePopups.length > 0) {
            for (const popup of this.damagePopups) {
                const popupX = popup.x - this.camera.x + this.cameraShake.x;
                const popupY = popup.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view
                if (popupX > -50 && popupX < this.canvas.width + 50 &&
                    popupY > -50 && popupY < this.canvas.height + 50) {
                    
                    // Fade out as lifetime decreases
                    const alpha = Math.min(1, popup.lifetime / popup.maxLifetime);
                    
                    this.ctx.save();
                    this.ctx.globalAlpha = alpha;
                    
                    // Draw damage text
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    
                    const text = `-${popup.damage}${popup.isBlocked ? ' BLOCKED' : ''}`;
                    // Use custom color if provided, otherwise use default based on isBlocked
                    if (popup.color) {
                        this.ctx.fillStyle = popup.color; // Custom color (e.g., orange for Fire Splitters)
                        this.ctx.strokeStyle = '#000';
                    } else if (popup.isBlocked) {
                        this.ctx.fillStyle = '#ffaa00'; // Orange for blocked
                        this.ctx.strokeStyle = '#000';
                    } else {
                        this.ctx.fillStyle = '#ff0000'; // Red for normal damage
                        this.ctx.strokeStyle = '#000';
                    }
                    this.ctx.strokeText(text, popupX, popupY);
                    this.ctx.fillText(text, popupX, popupY);
                    
                    this.ctx.restore();
                }
            }
        }
        
        // Draw player health bar in top left
        this.drawPlayerHealthBar();
        
        // Draw arrows (with screen shake)
        if (this.arrows && this.arrows.length > 0) {
            for (const arrow of this.arrows) {
                const arrowX = arrow.x - this.camera.x + this.cameraShake.x;
                const arrowY = arrow.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view
                if (arrowX > -arrow.width * 2 && arrowX < this.canvas.width + arrow.width * 2 &&
                    arrowY > -arrow.height * 2 && arrowY < this.canvas.height + arrow.height * 2) {
                    
                    this.ctx.save();
                    this.ctx.translate(arrowX + arrow.width / 2, arrowY + arrow.height / 2);
                    
                    // Apply flips based on arrow properties
                    let scaleX = 1;
                    let scaleY = 1;
                    
                    if (arrow.flipHorizontal) {
                        scaleX = -1;
                    }
                    if (arrow.flipVertical) {
                        scaleY = -1;
                    }
                    
                    // Legacy support for old arrow format
                    if (arrow.flipHorizontal === undefined && arrow.flipVertical === undefined) {
                        if (arrow.shootingUp) {
                            // Flip vertically for up direction
                            scaleY = -1;
                        } else if (!arrow.shootingLeft) {
                            // Flip horizontally for right direction
                            scaleX = -1;
                        }
                    }
                    
                    if (scaleX !== 1 || scaleY !== 1) {
                        this.ctx.scale(scaleX, scaleY);
                    }
                    
                    // Draw arrow sprite
                    if (arrow.sprite) {
                        this.ctx.drawImage(
                            arrow.sprite,
                            0, 0, arrow.sprite.width, arrow.sprite.height,
                            -arrow.width / 2, -arrow.height / 2,
                            arrow.width, arrow.height
                        );
                    } else {
                        // Fallback: draw colored rectangle if sprite not loaded
                        this.ctx.fillStyle = '#ff0000';
                        this.ctx.fillRect(-arrow.width / 2, -arrow.height / 2, arrow.width, arrow.height);
                    }
                    
                    this.ctx.restore();
                }
            }
        }
        
        // Draw magic projectiles (with screen shake)
        if (this.magicProjectiles && this.magicProjectiles.length > 0) {
            for (const proj of this.magicProjectiles) {
                const projX = proj.x - this.camera.x + this.cameraShake.x;
                const projY = proj.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view
                if (projX > -proj.width * 2 && projX < this.canvas.width + proj.width * 2 &&
                    projY > -proj.height * 2 && projY < this.canvas.height + proj.height * 2) {
                    
                    if (this.fireSplittersSpriteLoaded && this.fireSplittersSprite) {
                        // Calculate frame position (6 frames: 5 in row 1, 1 in row 2)
                        const frameWidth = 128;
                        const frameHeight = 64;
                        let sourceX, sourceY;
                        
                        // Use currentFrame (will be 0-5, then removed when complete)
                        if (proj.currentFrame < 5) {
                            // First 5 frames in row 1
                            sourceX = proj.currentFrame * frameWidth;
                            sourceY = 0;
                        } else {
                            // 6th frame in row 2
                            sourceX = 0;
                            sourceY = frameHeight;
                        }
                        
                        // Flip horizontally if facing left
                        this.ctx.save();
                        if (!proj.facingRight) {
                            this.ctx.translate(projX + proj.width, projY);
                            this.ctx.scale(-1, 1);
                            this.ctx.drawImage(
                                this.fireSplittersSprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                0, 0, proj.width, proj.height
                            );
                        } else {
                            this.ctx.drawImage(
                                this.fireSplittersSprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                projX, projY, proj.width, proj.height
                            );
                        }
                        this.ctx.restore();
                    } else {
                        // Fallback: draw orange rectangle
                        this.ctx.fillStyle = '#ff6600';
                        this.ctx.fillRect(projX, projY, proj.width, proj.height);
                    }
                }
            }
        }
        
        // Draw heavy attack effects (follows sword during strong attacks)
        if (this.heavyAttackEffects && this.heavyAttackEffects.length > 0) {
            for (const effect of this.heavyAttackEffects) {
                const effectX = effect.x - this.camera.x + this.cameraShake.x;
                const effectY = effect.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view
                if (effectX > -effect.width * 2 && effectX < this.canvas.width + effect.width * 2 &&
                    effectY > -effect.height * 2 && effectY < this.canvas.height + effect.height * 2) {
                    
                    if (this.heavyAttackEffectSpriteLoaded && this.heavyAttackEffectSprite) {
                        // Calculate frame position (5 frames, 192x128 each)
                        const frameWidth = 192;
                        const frameHeight = 128;
                        const sourceX = effect.currentFrame * frameWidth;
                        const sourceY = 0;
                        
                        // Flip horizontally if facing left
                        this.ctx.save();
                        if (!effect.facingRight) {
                            this.ctx.translate(effectX + effect.width, effectY);
                            this.ctx.scale(-1, 1);
                            this.ctx.drawImage(
                                this.heavyAttackEffectSprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                0, 0, effect.width, effect.height
                            );
                        } else {
                            this.ctx.drawImage(
                                this.heavyAttackEffectSprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                effectX, effectY, effect.width, effect.height
                            );
                        }
                        this.ctx.restore();
                    } else {
                        // Fallback: draw yellow rectangle
                        this.ctx.fillStyle = '#ffaa00';
                        this.ctx.fillRect(effectX, effectY, effect.width, effect.height);
                    }
                }
            }
        }
        
        // Draw heavy attack effects (follows sword during strong attacks)
        if (this.heavyAttackEffects && this.heavyAttackEffects.length > 0) {
            for (const effect of this.heavyAttackEffects) {
                const effectX = effect.x - this.camera.x + this.cameraShake.x;
                const effectY = effect.y - this.camera.y + this.cameraShake.y;
                
                // Only draw if in view
                if (effectX > -effect.width * 2 && effectX < this.canvas.width + effect.width * 2 &&
                    effectY > -effect.height * 2 && effectY < this.canvas.height + effect.height * 2) {
                    
                    if (this.heavyAttackEffectSpriteLoaded && this.heavyAttackEffectSprite) {
                        // Calculate frame position (5 frames, 192x128 each)
                        const frameWidth = 192;
                        const frameHeight = 128;
                        const sourceX = effect.currentFrame * frameWidth;
                        const sourceY = 0;
                        
                        // Flip horizontally if facing left
                        this.ctx.save();
                        if (!effect.facingRight) {
                            this.ctx.translate(effectX + effect.width, effectY);
                            this.ctx.scale(-1, 1);
                            this.ctx.drawImage(
                                this.heavyAttackEffectSprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                0, 0, effect.width, effect.height
                            );
                        } else {
                            this.ctx.drawImage(
                                this.heavyAttackEffectSprite,
                                sourceX, sourceY, frameWidth, frameHeight,
                                effectX, effectY, effect.width, effect.height
                            );
                        }
                        this.ctx.restore();
                    } else {
                        // Fallback: draw yellow rectangle
                        this.ctx.fillStyle = '#ffaa00';
                        this.ctx.fillRect(effectX, effectY, effect.width, effect.height);
                    }
                }
            }
        }
        
        // Draw character sprite or fallback rectangle
        const charX = this.character.x - this.camera.x + this.cameraShake.x;
        const charY = this.character.y - this.camera.y + this.cameraShake.y;
        
        // Determine which sprite to use (idle, running, dashing, or attacking)
        const isRanged = this.character.weaponMode === 'ranged';
        let spriteImg = isRanged ? this.character.rangedSpriteImage : this.character.spriteImage;
        let spriteLoaded = isRanged ? this.character.rangedSpriteLoaded : this.character.rangedSpriteLoaded;
        let frameCount = isRanged ? this.character.rangedIdleFrames : this.character.idleFrames;
        
        // Check if attacking
        const isMeleeAttacking = !isRanged && (this.character.attackType === 'basic' || this.character.attackType === 'strong') && this.character.attackTimer > 0;
        const isRangedAttacking = isRanged && this.character.attackType === 'strong' && this.character.attackTimer > 0;
        const isAttacking = isMeleeAttacking || isRangedAttacking;
        const isBasicAttack = this.character.attackType === 'basic' && this.character.attackTimer > 0;
        const isStrongAttack = this.character.attackType === 'strong' && this.character.attackTimer > 0;
        
        if (this.character.isDashing) {
            if (isRanged && this.character.rangedDashSpriteLoaded) {
                spriteImg = this.character.rangedDashSpriteImage;
                spriteLoaded = this.character.rangedDashSpriteLoaded;
                frameCount = this.character.rangedDashFrames;
            } else if (!isRanged && this.character.dashSpriteLoaded) {
                spriteImg = this.character.dashSpriteImage;
                spriteLoaded = this.character.dashSpriteLoaded;
                frameCount = this.character.dashFrames;
            }
        } else if (isRangedAttacking) {
            // Ranged attack sprites (body)
            if (this.character.isMoving && this.character.rangedRunAttackSpriteLoaded) {
                spriteImg = this.character.rangedRunAttackSpriteImage;
                spriteLoaded = this.character.rangedRunAttackSpriteLoaded;
                frameCount = this.character.rangedRunAttackFrames;
            } else if (this.character.rangedAttackSpriteLoaded) {
                spriteImg = this.character.rangedAttackSpriteImage;
                spriteLoaded = this.character.rangedAttackSpriteLoaded;
                frameCount = this.character.rangedAttackFrames;
            }
        } else if (isMeleeAttacking) {
            // Attack sprites (static or running)
            if (this.character.isMoving) {
                // Running attack
                if (isStrongAttack && this.character.runStrongAttackSpriteLoaded) {
                    spriteImg = this.character.runStrongAttackSpriteImage;
                    spriteLoaded = this.character.runStrongAttackSpriteLoaded;
                    frameCount = this.character.runStrongAttackFrames;
                } else if (isBasicAttack && this.character.runAttackSpriteLoaded) {
                    spriteImg = this.character.runAttackSpriteImage;
                    spriteLoaded = this.character.runAttackSpriteLoaded;
                    frameCount = this.character.runAttackFrames;
                }
            } else {
                // Static attack
                if (isStrongAttack && this.character.strongAttackSpriteLoaded) {
                    spriteImg = this.character.strongAttackSpriteImage;
                    spriteLoaded = this.character.strongAttackSpriteLoaded;
                    frameCount = this.character.strongAttackFrames;
                } else if (isBasicAttack && this.character.attackSpriteLoaded) {
                    spriteImg = this.character.attackSpriteImage;
                    spriteLoaded = this.character.attackSpriteLoaded;
                    frameCount = this.character.attackFrames;
                }
            }
        } else if (this.character.isMoving) {
            // Running sprites
            if (isRanged && this.character.rangedRunSpriteLoaded) {
                spriteImg = this.character.rangedRunSpriteImage;
                spriteLoaded = this.character.rangedRunSpriteLoaded;
                frameCount = this.character.rangedRunFrames;
            } else if (!isRanged && this.character.runSpriteLoaded) {
                spriteImg = this.character.runSpriteImage;
                spriteLoaded = this.character.runSpriteLoaded;
                frameCount = this.character.runFrames;
            }
        }
        
        // Draw character sprite
        if (spriteLoaded && spriteImg) {
            const frameWidth = this.character.spriteFrameWidth || 42;
            const frameHeight = this.character.spriteFrameHeight || 42;
            const sourceX = (this.character.currentFrame % Math.floor(spriteImg.width / frameWidth)) * frameWidth;
            const sourceY = Math.floor(this.character.currentFrame / Math.floor(spriteImg.width / frameWidth)) * frameHeight;
            
            this.ctx.save();
            if (!this.character.facingRight) {
                this.ctx.translate(charX + frameWidth, charY);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(spriteImg, sourceX, sourceY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
            } else {
                this.ctx.drawImage(spriteImg, sourceX, sourceY, frameWidth, frameHeight, charX, charY, frameWidth, frameHeight);
            }
            this.ctx.restore();
        } else {
            // Fallback rectangle
            this.ctx.fillStyle = this.character.facingRight ? '#00ff00' : '#00cc00';
            this.ctx.fillRect(charX, charY, this.character.width, this.character.height);
        }
        
        // Draw shield effect on character if active (AFTER character so it's visible on top)
        if (this.shieldEffect && this.shieldEffect.active && this.shieldSpriteLoaded && this.shieldSprite) {
            const shieldX = charX + (this.character.width / 2) - (this.shieldEffect.width / 2);
            const shieldY = charY + (this.character.height / 2) - (this.shieldEffect.height / 2);
            
            // Calculate frame position (15 frames: 3 rows x 5 frames per row)
            const frameWidth = 128;
            const frameHeight = 128;
            const framesPerRow = 5;
            const currentRow = Math.floor(this.shieldEffect.currentFrame / framesPerRow);
            const currentCol = this.shieldEffect.currentFrame % framesPerRow;
            const sourceX = currentCol * frameWidth;
            const sourceY = currentRow * frameHeight;
            
            this.ctx.save();
            this.ctx.globalAlpha = this.shieldEffect.opacity;
            this.ctx.drawImage(
                this.shieldSprite,
                sourceX, sourceY, frameWidth, frameHeight,
                shieldX, shieldY, this.shieldEffect.width, this.shieldEffect.height
            );
            this.ctx.restore();
        }
        
        // Draw bow overlay for ranged attacks (if applicable)
        const charCenterX = charX + this.character.width / 2;
        const charCenterY = charY + this.character.height / 2;
        
        // Health Regeneration Glow (mild green pulse)
        const isRegenerating = !this.character.isDead && 
                               this.character.health < this.character.maxHealth && 
                               this.character.lastDamageTime >= 3.0;
        if (isRegenerating) {
            // Pulsing effect based on regen timer
            const pulsePhase = (this.character.regenTimer / 2.0) * Math.PI * 2;
            const pulseIntensity = 0.275 + Math.sin(pulsePhase) * 0.175; // 10% to 45% alpha
            
            // Draw green glow
            const regenGradient = this.ctx.createRadialGradient(
                charCenterX, charCenterY, 0,
                charCenterX, charCenterY, this.character.width * 0.8
            );
            regenGradient.addColorStop(0, `rgba(100, 255, 100, ${pulseIntensity})`);
            regenGradient.addColorStop(0.5, `rgba(50, 200, 50, ${pulseIntensity * 0.5})`);
            regenGradient.addColorStop(1, 'rgba(0, 150, 0, 0)');
            
            this.ctx.fillStyle = regenGradient;
            this.ctx.beginPath();
            this.ctx.arc(charCenterX, charCenterY, this.character.width * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Berserker Glow (red pulse when below 50% health)
        const isBerserkerActive = this.abilities && 
                                  this.abilities.berserker && 
                                  this.character.health < this.character.maxHealth * 0.5 &&
                                  !this.character.isDead;
        if (isBerserkerActive) {
            // Intense pulsing red glow
            const berserkerPulse = (Date.now() % 1000) / 1000; // 0 to 1 every second
            const berserkerIntensity = 0.2 + Math.sin(berserkerPulse * Math.PI * 2) * 0.15; // 0.05 to 0.35 alpha
            
            // Draw fierce red glow
            const berserkerGradient = this.ctx.createRadialGradient(
                charCenterX, charCenterY, 0,
                charCenterX, charCenterY, this.character.width * 0.9
            );
            berserkerGradient.addColorStop(0, `rgba(255, 50, 50, ${berserkerIntensity})`);
            berserkerGradient.addColorStop(0.4, `rgba(200, 0, 0, ${berserkerIntensity * 0.6})`);
            berserkerGradient.addColorStop(1, 'rgba(150, 0, 0, 0)');
            
            this.ctx.fillStyle = berserkerGradient;
            this.ctx.beginPath();
            this.ctx.arc(charCenterX, charCenterY, this.character.width * 0.9, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        if (spriteLoaded && spriteImg) {
            // Draw sprite with animation (scaled from 42x42 to 64x64)
            const frameWidth = this.character.spriteFrameWidth || 42;
            const frameHeight = this.character.spriteFrameHeight || 42;
            const frameIndex = this.character.currentFrame % frameCount;
            const sourceX = frameIndex * frameWidth;
            const sourceY = 0;
            
            // Removed magic attack tint (was causing gray box)
            
            // Draw sprite frame with flipping for left/right direction
            this.ctx.save();
            
            if (!this.character.facingRight) {
                // Flip horizontally when facing left
                this.ctx.translate(charX + this.character.width, charY);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(
                    spriteImg,
                    sourceX, sourceY, frameWidth, frameHeight,
                    0, 0, this.character.width, this.character.height
                );
            } else {
                // Draw normally when facing right
                this.ctx.drawImage(
                    spriteImg,
                    sourceX, sourceY, frameWidth, frameHeight,
                    charX, charY, this.character.width, this.character.height
                );
            }
            
            this.ctx.restore();
            
            // Draw bow sprite on top when in ranged mode and attacking
            if (isRangedAttacking && this.character.bowSpriteLoaded && this.character.bowSpriteImage) {
                const bowFrameWidth = this.character.spriteFrameWidth || 42;
                const bowFrameHeight = this.character.spriteFrameHeight || 42;
                const bowFrameIndex = this.character.currentFrame % this.character.bowFrames;
                const bowSourceX = bowFrameIndex * bowFrameWidth;
                const bowSourceY = 0;
                
                // Center of character for rotation
                const centerX = charX + this.character.width / 2;
                const centerY = charY + this.character.height / 2;
                
                // Get shoot direction
                const shootDir = this.character.shootDirection;
                
                // Determine which bow sprite to use based on direction
                // Up: y < 0 and |y| > |x|, Down: y > 0 and |y| > |x|, else: left/right
                const absX = Math.abs(shootDir.x);
                const absY = Math.abs(shootDir.y);
                const shootingUp = shootDir.y < 0 && absY > absX;
                const shootingDown = shootDir.y > 0 && absY > absX;
                const shootingLeft = shootDir.x < 0 && !shootingUp && !shootingDown;
                
                // Select the correct bow sprite
                let bowSprite = this.character.bowSpriteImage;
                if (shootingUp && this.character.bowUpSpriteLoaded) {
                    bowSprite = this.character.bowUpSpriteImage;
                } else if (shootingDown && this.character.bowDownSpriteLoaded) {
                    bowSprite = this.character.bowDownSpriteImage;
                }
                
                this.ctx.save();
                this.ctx.translate(centerX, centerY);
                
                // Only apply transforms for left/right shooting (up/down sprites are already oriented)
                if (shootingUp || shootingDown) {
                    // No rotation or flip needed for up/down sprites
                    // Just flip horizontally if character is facing left
                    if (!this.character.facingRight) {
                        this.ctx.scale(-1, 1);
                    }
                } else {
                    // Left/right shooting - apply rotation and flip
                    if (shootingLeft) {
                        this.ctx.scale(-1, 1);
                        this.ctx.rotate(Math.atan2(shootDir.y, -shootDir.x));
                    } else {
                        this.ctx.rotate(Math.atan2(shootDir.y, shootDir.x));
                    }
                }
                
                // Draw bow sprite centered
                this.ctx.drawImage(
                    bowSprite,
                    bowSourceX, bowSourceY, bowFrameWidth, bowFrameHeight,
                    -this.character.width / 2, -this.character.height / 2,
                    this.character.width, this.character.height
                );
                this.ctx.restore();
            }
        } else {
            // Fallback: draw colored rectangle
            this.ctx.fillStyle = this.character.color;
            this.ctx.fillRect(charX, charY, this.character.width, this.character.height);
        }
        
        // Draw character center point (for debugging)
        if (this.keys['v']) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(charX + this.character.width / 2, charY + this.character.height / 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Update position display
        const posEl = document.getElementById('position');
        if (posEl) {
            posEl.textContent = `Position: (${Math.floor(this.character.x)}, ${Math.floor(this.character.y)}) | Camera: (${Math.floor(this.camera.x)}, ${Math.floor(this.camera.y)})`;
        }
    }

    swapWeapon() {
        // Don't allow weapon swap when hurt or dead
        if (this.character.isDead) {
            return;
        }
        // Toggle between melee and ranged (can swap while hurt)
        this.character.weaponMode = this.character.weaponMode === 'melee' ? 'ranged' : 'melee';
        // Reset animation frame when swapping
        this.character.currentFrame = 0;
        this.character.frameTime = 0;
        console.log('Weapon swapped to:', this.character.weaponMode);
    }
    
    createArrow() {
        if (!this.arrowSpritesLoaded) {
            console.warn('Arrow sprites not loaded yet, cannot create arrow');
            return;
        }
        
        const shootDir = this.character.shootDirection;
        
        // Validate shoot direction - ensure it's not zero
        const dirLen = Math.sqrt(shootDir.x * shootDir.x + shootDir.y * shootDir.y);
        if (dirLen < 0.01) {
            // Invalid direction, use default based on facing
            console.warn('Invalid shoot direction, using facing direction');
            this.character.shootDirection.x = this.character.facingRight ? 1 : -1;
            this.character.shootDirection.y = 0;
        }
        
        const arrowSpeed = 400; // pixels per second
        
        // If multishot is active, create 3 arrows in a spread
        const arrowDirections = [];
        if (this.abilities.multishot) {
            // Main arrow + 2 spread arrows at ~15 degree angles
            const spreadAngle = 0.26; // ~15 degrees in radians
            
            // Calculate angle of main direction
            const mainAngle = Math.atan2(this.character.shootDirection.y, this.character.shootDirection.x);
            
            // Left spread arrow
            arrowDirections.push({
                x: Math.cos(mainAngle - spreadAngle),
                y: Math.sin(mainAngle - spreadAngle)
            });
            
            // Main arrow
            arrowDirections.push({
                x: this.character.shootDirection.x,
                y: this.character.shootDirection.y
            });
            
            // Right spread arrow
            arrowDirections.push({
                x: Math.cos(mainAngle + spreadAngle),
                y: Math.sin(mainAngle + spreadAngle)
            });
        } else {
            // Single arrow
            arrowDirections.push({
                x: this.character.shootDirection.x,
                y: this.character.shootDirection.y
            });
        }
        
        // Create each arrow
        for (const dir of arrowDirections) {
            // Normalize direction
            const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (len < 0.01) {
                console.warn('Skipping arrow with invalid direction');
                continue; // Skip invalid directions
            }
            const normDir = { x: dir.x / len, y: dir.y / len };
            
            // Determine arrow dimensions and direction
            const absX = Math.abs(normDir.x);
            const absY = Math.abs(normDir.y);
            const isDiagonal = absX > 0.3 && absY > 0.3; // Both x and y are significant
            
            const shootingUp = normDir.y < 0;
            const shootingDown = normDir.y > 0;
            const shootingLeft = normDir.x < 0;
            const shootingRight = normDir.x > 0;
            
            let width, height, sprite, shootingUpArrow, shootingLeftArrow, flipVertical, flipHorizontal;
            
            if (isDiagonal) {
                // Diagonal arrow (12x14)
                width = 12;
                height = 14;
                
                if (shootingRight) {
                    // Diagonal right (up-right or down-right)
                    sprite = this.arrowDiagonalRightSprite;
                    shootingLeftArrow = false;
                    flipVertical = shootingDown; // Flip for down-right
                    flipHorizontal = false;
                } else {
                    // Diagonal left (up-left or down-left)
                    sprite = this.arrowDiagonalLeftSprite;
                    shootingLeftArrow = true;
                    flipVertical = shootingDown; // Flip for down-left
                    flipHorizontal = false;
                }
                shootingUpArrow = shootingUp;
            } else if (absY > absX) {
                // Vertical arrow (3x14, flip for up)
                width = 3;
                height = 14;
                sprite = this.arrowDownSprite;
                shootingUpArrow = shootingUp;
                shootingLeftArrow = false;
                flipVertical = false;
                flipHorizontal = false;
            } else {
                // Horizontal arrow (14x3, flip for right)
                width = 14;
                height = 3;
                sprite = this.arrowLeftSprite;
                shootingUpArrow = false;
                shootingLeftArrow = shootingLeft;
                flipVertical = false;
                flipHorizontal = false;
            }
            
            // Create arrow at character center
            const arrow = {
                x: this.character.x + this.character.width / 2 - width / 2,
                y: this.character.y + this.character.height / 2 - height / 2,
                width: width,
                height: height,
                vx: normDir.x * arrowSpeed,
                vy: normDir.y * arrowSpeed,
                sprite: sprite,
                shootingUp: shootingUpArrow,
                shootingLeft: shootingLeftArrow,
                flipVertical: flipVertical,
                flipHorizontal: flipHorizontal,
                lifetime: 3.0 // 3 seconds max lifetime
            };
            
            this.arrows.push(arrow);
            console.log('✓ Arrow created! Direction:', normDir.x.toFixed(2), normDir.y.toFixed(2), 'Position:', arrow.x.toFixed(0), arrow.y.toFixed(0));
        }
        
        if (arrowDirections.length > 0) {
            console.log('✓ Total arrows created:', arrowDirections.length);
        }
    }
    
    updateArrows(deltaTime) {
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            
            // Update position
            arrow.x += arrow.vx * deltaTime;
            arrow.y += arrow.vy * deltaTime;
            
            // Update lifetime
            arrow.lifetime -= deltaTime;
            
            // Remove if lifetime expired or out of bounds
            const margin = 500; // Remove arrows that are far off-screen
            if (arrow.lifetime <= 0 ||
                arrow.x < this.camera.x - margin ||
                arrow.x > this.camera.x + this.canvas.width + margin ||
                arrow.y < this.camera.y - margin ||
                arrow.y > this.camera.y + this.canvas.height + margin) {
                this.arrows.splice(i, 1);
                continue;
            }
            
            // Check collision with enemies first
            let hitEnemy = false;
            // Increase arrow hitbox by 15% for better range (15% larger collision area)
            const arrowHitboxPadding = 0.15; // 15% larger hitbox
            const arrowRect = {
                x: arrow.x - (arrow.width * arrowHitboxPadding / 2),
                y: arrow.y - (arrow.height * arrowHitboxPadding / 2),
                width: arrow.width * (1 + arrowHitboxPadding),
                height: arrow.height * (1 + arrowHitboxPadding)
            };
            
            for (const enemy of this.enemies) {
                if (!enemy || enemy.health <= 0) continue; // Skip dead enemies
                
                const enemyRect = {
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.width,
                    height: enemy.height
                };
                
                if (this.checkCollision(arrowRect, enemyRect)) {
                    // Calculate damage (check for block) with ability modifiers
                    let damage = this.calculateDamage(15, 'ranged');
                    let isBlocked = false;
                    
                    // Check if Yellow Knight is blocking - 100% chance to block 50% damage when blocking
                    if (enemy.type === 'yellowKnight' && enemy.isBlocking) {
                        damage = Math.floor(damage * 0.5); // 50% damage reduction (always blocks when in block mode)
                        isBlocked = true;
                        console.log(`Yellow Knight blocked arrow! Original damage: 20, Blocked damage: ${damage}`);
                    }
                    
                    enemy.health -= damage;
                    console.log(`Enemy hit by ranged attack! Damage: ${damage}${isBlocked ? ' (BLOCKED)' : ''}, Health: ${enemy.health}`);
                    
                    // Check for Blue Golem hurt animation triggers (at 25%, 50%, 75% health)
                    if (enemy.type === 'blueGolem' && enemy.hurtThresholds && enemy.hurtThresholdsUsed) {
                        const healthPercent = enemy.health / enemy.maxHealth;
                        for (let j = 0; j < enemy.hurtThresholds.length; j++) {
                            const threshold = enemy.hurtThresholds[j];
                            if (healthPercent <= threshold && !enemy.hurtThresholdsUsed.includes(threshold)) {
                                enemy.hurtThresholdsUsed.push(threshold);
                                enemy.isHurt = true;
                                enemy.hurtTimer = enemy.hurtFrames * enemy.hurtFrameDuration;
                                enemy.currentFrame = 0;
                                enemy.frameTime = 0;
                                console.log(`Blue Golem hurt animation triggered at ${threshold * 100}% health!`);
                                break;
                            }
                        }
                    }
                    
                    // Create damage popup
                    this.createDamagePopup(enemy.x + enemy.width / 2, enemy.y, damage, isBlocked);
                    
                    this.arrows.splice(i, 1);
                    hitEnemy = true;
                    
                    // Set enemy to death state if health <= 0 (ranged kill)
                    if (enemy.health <= 0 && !enemy.isDead) {
                        enemy.isDead = true;
                        if (enemy.type === 'blueGolem') {
                            enemy.state = 'dying';
                            enemy.deathAnimationTimer = enemy.dieFrames * enemy.dieFrameDuration; // 12 frames * 0.2s = 2.4s
                            enemy.currentFrame = 0; // Start at frame 0 for Blue Golem
                            enemy.frameTime = 0;
                        } else {
                            enemy.state = 'dying';
                            enemy.deathAnimationTimer = 1.12; // 4 frames * 0.28s = 1.12s (40% slower: 0.2s * 1.4 = 0.28s per frame)
                            enemy.currentFrame = 4; // Start at frame 4 (last 4 frames: 4, 5, 6, 7)
                            enemy.frameTime = 0;
                            enemy.deathFrameCount = 0; // Track how many death frames have played
                        }
                        console.log('Enemy defeated by ranged attack!');
                        
                        // Check if boss was defeated
                        if (enemy.type === 'blueGolem' && this.bossQuest.started && !this.bossQuest.bossDefeated) {
                            this.bossQuest.bossDefeated = true;
                            console.log('Blue Golem boss defeated! Return to the monk for your reward!');
                            // Show exclamation point again on boss quest NPC
                            if (this.bossQuestNPC) {
                                this.bossQuestNPC.showExclamation = true;
                            }
                        }
                        
                        // Award XP for kill
                        this.gainXP(enemy.type || 'default');
                        
                        // Play disappearing sound effect
                        this.playEnemyDeathSound();
                    }
                    break;
                }
            }
            
            if (hitEnemy) continue;
            
            // Check collision with walls/objects
            for (const obj of this.collisionObjects) {
                if (this.checkCollision(arrowRect, obj)) {
                    // Arrow hit something, remove it
                    this.arrows.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    updateEnemies(deltaTime) {
        if (!this.enemies || this.enemies.length === 0) return;
        
        for (const enemy of this.enemies) {
            // Handle dead enemies - update death animation only, then skip AI
            if (enemy.isDead && enemy.state === 'dying') {
                // Death animation
                enemy.deathAnimationTimer -= deltaTime;
                enemy.frameTime += deltaTime;
                
                if (enemy.type === 'blueGolem') {
                    // Blue Golem death animation (12 frames, 0.2s per frame)
                    if (enemy.frameTime >= enemy.dieFrameDuration) {
                        enemy.frameTime = 0;
                        if (enemy.currentFrame < enemy.dieFrames - 1) {
                            enemy.currentFrame++;
                        } else if (enemy.currentFrame === enemy.dieFrames - 1) {
                            // Last frame has been displayed for its full duration, remove immediately
                            const enemyIndex = this.enemies.indexOf(enemy);
                            if (enemyIndex > -1) {
                                this.enemies.splice(enemyIndex, 1);
                                continue; // Skip rest of loop for this enemy
                            }
                        }
                    }
                } else {
                    // Other enemies death animation (last 4 frames of character death animation, 40% slower)
                    // Update death animation frame (40% slower: 0.2s * 1.4 = 0.28s per frame)
                    if (enemy.frameTime >= 0.28) {
                        enemy.frameTime = 0;
                        if (enemy.currentFrame < 7) { 
                            // Progress through frames 4, 5, 6
                            enemy.currentFrame++;
                        } else if (enemy.currentFrame === 7) {
                            // Last frame (7) has been displayed for its full duration, remove immediately
                            const enemyIndex = this.enemies.indexOf(enemy);
                            if (enemyIndex > -1) {
                                this.enemies.splice(enemyIndex, 1);
                                continue; // Skip rest of loop for this enemy
                            }
                        }
                    }
                }
                
                // Safety check: remove if timer expires (shouldn't happen if logic is correct)
                if (enemy.deathAnimationTimer <= 0) {
                    const enemyIndex = this.enemies.indexOf(enemy);
                    if (enemyIndex > -1) {
                        this.enemies.splice(enemyIndex, 1);
                        continue; // Skip rest of loop for this enemy
                    }
                }
                
                // Skip AI updates for dead enemies
                continue;
            }
            
            // Calculate distance to player
            const dx = this.character.x - enemy.x;
            const dy = this.character.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Update enemy animation
            enemy.frameTime += deltaTime;
            
            // Yellow Knights now always block - no timer needed
            // (blockTimer kept for compatibility but not used)
            
            // Update attack timer
            if (enemy.attackTimer > 0) {
                enemy.attackTimer -= deltaTime;
                
                // Deal damage halfway through attack animation (for Orc Barbarian) - only if not dead
                if (!enemy.isDead && enemy.type === 'orcBarbarian' && enemy.attackDamage > 0 && !enemy.hasDealtDamage) {
                    const attackDuration = enemy.attackFrames * enemy.attackFrameDuration;
                    const elapsed = attackDuration - enemy.attackTimer;
                    // Check if we're halfway through (at frame 6 of 12 frames)
                    const halfwayPoint = attackDuration / 2;
                    if (elapsed >= halfwayPoint && !enemy.hasDealtDamage) {
                        enemy.hasDealtDamage = true;
                        const charCenterX = this.character.x + this.character.width / 2;
                        const charCenterY = this.character.y + this.character.height / 2;
                        const enemyCenterX = enemy.x + enemy.width / 2;
                        const enemyCenterY = enemy.y + enemy.height / 2;
                        const attackDx = charCenterX - enemyCenterX;
                        const attackDy = charCenterY - enemyCenterY;
                        const attackDistance = Math.sqrt(attackDx * attackDx + attackDy * attackDy);
                        
                        if (attackDistance <= enemy.attackRange && !this.character.isDead) {
                            const actualDamage = this.calculateDamageTaken(enemy.attackDamage);
                            this.character.health -= actualDamage;
                            this.character.lastDamageTime = 0; // Reset regen timer on damage
                            console.log(`Player hit by Orc Barbarian! Damage: ${actualDamage}, Health: ${this.character.health}`);
                            this.createDamagePopup(charCenterX, charCenterY, actualDamage);
                            
                            // Mild screen shake AND hurt animation
                            this.triggerScreenShake(0.15, 3);
                            
                            // Trigger hurt animation
                            if (this.character.health > 0) {
                                this.character.isHurt = true;
                                this.character.hurtTimer = 0.4; // 4 frames * 0.1s
                                this.character.currentFrame = 0;
                                this.character.frameTime = 0;
                            }
                            
                            if (this.character.health <= 0) {
                                this.character.health = 0;
                                this.character.isDead = true;
                                console.log('Player defeated!');
                            }
                        }
                    }
                }
                
                // When attack timer finishes, ensure we're back to idle
                if (enemy.attackTimer <= 0 && enemy.state === 'attacking') {
                    enemy.state = 'idle';
                    enemy.currentFrame = 0;
                    enemy.frameTime = 0;
                    enemy.hasDealtDamage = false; // Reset damage flag
                    
                    // Deal damage to player if melee enemy (Yellow Knight - at end of attack) - only if not dead
                    if (!enemy.isDead && enemy.type === 'yellowKnight' && enemy.attackDamage > 0) {
                        const charCenterX = this.character.x + this.character.width / 2;
                        const charCenterY = this.character.y + this.character.height / 2;
                        const enemyCenterX = enemy.x + enemy.width / 2;
                        const enemyCenterY = enemy.y + enemy.height / 2;
                        const attackDx = charCenterX - enemyCenterX;
                        const attackDy = charCenterY - enemyCenterY;
                        const attackDistance = Math.sqrt(attackDx * attackDx + attackDy * attackDy);
                        
                        // Use attackHitRange if available (larger range for damage), otherwise use attackRange
                        const hitRange = enemy.attackHitRange || enemy.attackRange;
                        if (attackDistance <= hitRange && !this.character.isDead) {
                            const actualDamage = this.calculateDamageTaken(enemy.attackDamage);
                            this.character.health -= actualDamage;
                            this.character.lastDamageTime = 0; // Reset regen timer on damage
                            console.log(`Player hit by Yellow Knight! Damage: ${actualDamage}, Health: ${this.character.health}`);
                            this.createDamagePopup(charCenterX, charCenterY, actualDamage);
                            
                            // Mild screen shake AND hurt animation
                            this.triggerScreenShake(0.15, 3);
                            
                            // Trigger hurt animation
                            if (this.character.health > 0) {
                                this.character.isHurt = true;
                                this.character.hurtTimer = 0.4; // 4 frames * 0.1s
                                this.character.currentFrame = 0;
                                this.character.frameTime = 0;
                            }
                            
                            if (this.character.health <= 0) {
                                this.character.health = 0;
                                this.character.isDead = true;
                                console.log('Player defeated!');
                            }
                        }
                    }
                }
            }
            
            // Update attack cooldown
            if (enemy.attackCooldown > 0) {
                enemy.attackCooldown -= deltaTime;
            }
            
            // Update shoot cooldown for yellow archers
            if (enemy.type === 'yellowArcher' && enemy.shootCooldown > 0) {
                enemy.shootCooldown -= deltaTime;
            }
            
            // AI Logic - different for different enemy types
            if (enemy.type === 'yellowKnight') {
                // Yellow Knight AI - Always blocking, move at 100% speed, attack when near, then return to blocking
                
                // If currently attacking, wait for attack to finish
                if (enemy.attackTimer > 0) {
                    enemy.state = 'attacking';
                    enemy.isBlocking = false; // Not blocking while attacking
                }
                // Check if player is detected
                else if (distance < enemy.detectionRange) {
                    // Face player when in detection range
                    enemy.facingRight = dx > 0;
                    
                    // Check if player is in attack range and we can attack
                    if (distance <= enemy.attackRange && enemy.attackCooldown <= 0) {
                        // Attack the player!
                        enemy.isBlocking = false;
                        enemy.state = 'attacking';
                        enemy.attackTimer = enemy.attackFrames * enemy.attackFrameDuration;
                        enemy.attackCooldown = 1.5; // 1.5 second cooldown
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                        console.log('Yellow Knight attacks!');
                    }
                    // Always move toward player if outside attack range (at 100% speed, always blocking)
                    else if (distance > enemy.attackRange) {
                        enemy.isBlocking = true;
                        enemy.state = 'moving';
                        
                        let moveX = (dx / distance) * enemy.speed * deltaTime; // 100% speed while blocking
                        let moveY = (dy / distance) * enemy.speed * deltaTime;
                        
                        // Check collision before moving
                        const newX = enemy.x + moveX;
                        const newY = enemy.y + moveY;
                        
                        let canMoveX = true;
                        let canMoveY = true;
                        
                        const testRectX = { x: newX, y: enemy.y, width: enemy.width, height: enemy.height };
                        const testRectY = { x: enemy.x, y: newY, width: enemy.width, height: enemy.height };
                        
                        for (const obj of this.collisionObjects) {
                            if (canMoveX && this.checkCollision(testRectX, obj)) canMoveX = false;
                            if (canMoveY && this.checkCollision(testRectY, obj)) canMoveY = false;
                        }
                        
                        if (canMoveX) enemy.x = newX;
                        if (canMoveY) enemy.y = newY;
                        
                        // If can't move in both directions, try one at a time
                        if (!canMoveX && !canMoveY) {
                            // Try only X
                            const testX = enemy.x + moveX;
                            const testRectXOnly = { x: testX, y: enemy.y, width: enemy.width, height: enemy.height };
                            let canMoveXOnly = true;
                            for (const obj of this.collisionObjects) {
                                if (this.checkCollision(testRectXOnly, obj)) {
                                    canMoveXOnly = false;
                                    break;
                                }
                            }
                            if (canMoveXOnly) enemy.x = testX;
                            
                            // Try only Y
                            const testY = enemy.y + moveY;
                            const testRectYOnly = { x: enemy.x, y: testY, width: enemy.width, height: enemy.height };
                            let canMoveYOnly = true;
                            for (const obj of this.collisionObjects) {
                                if (this.checkCollision(testRectYOnly, obj)) {
                                    canMoveYOnly = false;
                                    break;
                                }
                            }
                            if (canMoveYOnly) enemy.y = testY;
                        }
                    }
                    // In attack range but on cooldown - stay in blocking stance and wait
                    else {
                        enemy.isBlocking = true;
                        enemy.state = 'blocking';
                    }
                }
                // Player not detected - idle, but still blocking
                else {
                    enemy.isBlocking = true;
                    enemy.state = 'idle';
                }
            } else if (enemy.type === 'orcBarbarian') {
                // Orc Barbarian AI - fast melee attacker
                if (distance < enemy.detectionRange) {
                    // Face player
                    enemy.facingRight = dx > 0;
                    
                    if (distance <= enemy.attackRange && enemy.attackCooldown <= 0 && enemy.attackTimer <= 0) {
                        // In attack range - attack player
                        enemy.state = 'attacking';
                        enemy.attackTimer = enemy.attackFrames * enemy.attackFrameDuration;
                        enemy.attackCooldown = 1.2; // 1.2 second cooldown
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                    } else if (enemy.attackTimer <= 0) {
                        // Move toward player (fast movement)
                        enemy.state = 'moving';
                        
                        let moveX = 0;
                        let moveY = 0;
                        
                        if (distance > enemy.attackRange) {
                            // Too far - move toward player (fast)
                            moveX = (dx / distance) * enemy.speed * deltaTime;
                            moveY = (dy / distance) * enemy.speed * deltaTime;
                        }
                        
                        // Check collision before moving
                        const newX = enemy.x + moveX;
                        const newY = enemy.y + moveY;
                        
                        let canMoveX = true;
                        let canMoveY = true;
                        
                        const testRectX = { x: newX, y: enemy.y, width: enemy.width, height: enemy.height };
                        const testRectY = { x: enemy.x, y: newY, width: enemy.width, height: enemy.height };
                        
                        for (const obj of this.collisionObjects) {
                            if (canMoveX && this.checkCollision(testRectX, obj)) canMoveX = false;
                            if (canMoveY && this.checkCollision(testRectY, obj)) canMoveY = false;
                        }
                        
                        if (canMoveX) enemy.x = newX;
                        if (canMoveY) enemy.y = newY;
                    }
                } else {
                    // Player not in range, idle
                    enemy.state = 'idle';
                }
            } else if (enemy.type === 'yellowArcher') {
                // Yellow Archer AI - ranged attacker
                if (distance < enemy.detectionRange) {
                    // Face player
                    enemy.facingRight = dx > 0;
                    
                    // Update shoot timer
                    if (enemy.shootTimer > 0) {
                        enemy.shootTimer -= deltaTime;
                    }
                    
                    // Check if in range and can shoot
                    if (distance <= enemy.attackRange && enemy.shootCooldown <= 0 && enemy.shootTimer <= 0) {
                        // In range - shoot
                        enemy.state = 'shooting';
                        enemy.shootTimer = enemy.shootFrames * enemy.shootFrameDuration;
                        enemy.shootCooldown = 2.0; // 2 second cooldown
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                        enemy.arrowCreated = false; // Reset arrow creation flag
                        console.log('Yellow Archer shooting!');
                    } else if (enemy.shootTimer <= 0) {
                        // Move toward player if too far, or maintain position
                        let moveX = 0;
                        let moveY = 0;
                        
                        if (distance > enemy.attackRange * 0.8) {
                            // Too far - move toward player
                            enemy.state = 'moving';
                            moveX = (dx / distance) * enemy.speed * deltaTime;
                            moveY = (dy / distance) * enemy.speed * deltaTime;
                        } else {
                            // In good position, maintain idle
                            enemy.state = 'idle';
                        }
                        
                        if (moveX !== 0 || moveY !== 0) {
                            // Check collision before moving
                            const newX = enemy.x + moveX;
                            const newY = enemy.y + moveY;
                            
                            let canMoveX = true;
                            let canMoveY = true;
                            
                            const testRectX = { x: newX, y: enemy.y, width: enemy.width, height: enemy.height };
                            const testRectY = { x: enemy.x, y: newY, width: enemy.width, height: enemy.height };
                            
                            for (const obj of this.collisionObjects) {
                                if (canMoveX && this.checkCollision(testRectX, obj)) canMoveX = false;
                                if (canMoveY && this.checkCollision(testRectY, obj)) canMoveY = false;
                            }
                            
                            if (canMoveX) enemy.x = newX;
                            if (canMoveY) enemy.y = newY;
                            
                            // If can't move diagonally, try to move in one direction only (prevent getting stuck)
                            if (!canMoveX && !canMoveY && (moveX !== 0 || moveY !== 0)) {
                                // Try moving only horizontally
                                if (moveX !== 0) {
                                    const testX = enemy.x + moveX;
                                    const testRectXOnly = { x: testX, y: enemy.y, width: enemy.width, height: enemy.height };
                                    let canMoveXOnly = true;
                                    for (const obj of this.collisionObjects) {
                                        if (this.checkCollision(testRectXOnly, obj)) {
                                            canMoveXOnly = false;
                                            break;
                                        }
                                    }
                                    if (canMoveXOnly) enemy.x = testX;
                                }
                                // Try moving only vertically
                                if (moveY !== 0) {
                                    const testY = enemy.y + moveY;
                                    const testRectYOnly = { x: enemy.x, y: testY, width: enemy.width, height: enemy.height };
                                    let canMoveYOnly = true;
                                    for (const obj of this.collisionObjects) {
                                        if (this.checkCollision(testRectYOnly, obj)) {
                                            canMoveYOnly = false;
                                            break;
                                        }
                                    }
                                    if (canMoveYOnly) enemy.y = testY;
                                }
                            }
                        }
                    }
                } else {
                    // Player not in range, idle
                    enemy.state = 'idle';
                }
            } else if (enemy.type === 'blueGolem') {
                // Blue Golem Boss AI - aggressive melee boss
                // Update hurt timer
                if (enemy.hurtTimer > 0) {
                    enemy.hurtTimer -= deltaTime;
                    if (enemy.hurtTimer <= 0) {
                        enemy.isHurt = false;
                    }
                }
                
                // If hurt animation is playing, don't do anything else
                if (enemy.isHurt && enemy.hurtTimer > 0) {
                    enemy.state = 'hurt';
                }
                // If currently attacking, wait for attack to finish
                else if (enemy.attackTimer > 0) {
                    enemy.state = 'attacking';
                }
                // Check if player is detected
                else if (distance < enemy.detectionRange) {
                    // Face player when in detection range
                    enemy.facingRight = dx > 0;
                    
                    // Check if player is in attack range and we can attack
                    if (distance <= enemy.attackRange && enemy.attackCooldown <= 0) {
                        // Attack the player!
                        enemy.state = 'attacking';
                        enemy.attackTimer = enemy.attackFrames * enemy.attackFrameDuration;
                        enemy.attackCooldown = 2.0; // 2 second cooldown
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                        enemy.hasDealtDamage = false; // Reset damage flag
                        console.log('Blue Golem attacks!');
                    }
                    // Move toward player if outside attack range
                    else if (distance > enemy.attackRange) {
                        // Move toward player
                        enemy.state = 'walking';
                        
                        let moveX = (dx / distance) * enemy.speed * deltaTime;
                        let moveY = (dy / distance) * enemy.speed * deltaTime;
                        
                        // Check collision before moving
                        const newX = enemy.x + moveX;
                        const newY = enemy.y + moveY;
                        
                        let canMoveX = true;
                        let canMoveY = true;
                        
                        const testRectX = { x: newX, y: enemy.y, width: enemy.width, height: enemy.height };
                        const testRectY = { x: enemy.x, y: newY, width: enemy.width, height: enemy.height };
                        
                        for (const obj of this.collisionObjects) {
                            if (canMoveX && this.checkCollision(testRectX, obj)) canMoveX = false;
                            if (canMoveY && this.checkCollision(testRectY, obj)) canMoveY = false;
                        }
                        
                        if (canMoveX) enemy.x = newX;
                        if (canMoveY) enemy.y = newY;
                        
                        // If can't move, try to move in one direction only (prevent getting stuck)
                        if (!canMoveX && !canMoveY && (moveX !== 0 || moveY !== 0)) {
                            // Try moving only horizontally
                            if (moveX !== 0) {
                                const testX = enemy.x + moveX;
                                const testRectXOnly = { x: testX, y: enemy.y, width: enemy.width, height: enemy.height };
                                let canMoveXOnly = true;
                                for (const obj of this.collisionObjects) {
                                    if (this.checkCollision(testRectXOnly, obj)) {
                                        canMoveXOnly = false;
                                        break;
                                    }
                                }
                                if (canMoveXOnly) enemy.x = testX;
                            }
                            // Try moving only vertically
                            if (moveY !== 0) {
                                const testY = enemy.y + moveY;
                                const testRectYOnly = { x: enemy.x, y: testY, width: enemy.width, height: enemy.height };
                                let canMoveYOnly = true;
                                for (const obj of this.collisionObjects) {
                                    if (this.checkCollision(testRectYOnly, obj)) {
                                        canMoveYOnly = false;
                                        break;
                                    }
                                }
                                if (canMoveYOnly) enemy.y = testY;
                            }
                        }
                    }
                    // In attack range but can't attack (cooldown), stay idle
                    else {
                        enemy.state = 'idle';
                    }
                }
                // Player not in range, idle
                else {
                    enemy.state = 'idle';
                }
            } else if (enemy.type === 'archer') {
                // Orc Archer AI - simplified ranged attacker
                if (distance < enemy.detectionRange) {
                    // Face player when in detection range
                    enemy.facingRight = dx > 0;
                    
                    // Check if in attack range and can attack
                    if (distance <= enemy.attackRange && enemy.attackCooldown <= 0 && enemy.attackTimer <= 0) {
                        // In range - attack player
                        enemy.state = 'attacking';
                        enemy.attackTimer = enemy.attackFrames * enemy.attackFrameDuration;
                        enemy.attackCooldown = 2.0; // 2 second cooldown
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                        enemy.arrowCreated = false; // Reset arrow creation flag
                        console.log('Orc Archer attacking!');
                    } else if (enemy.attackTimer <= 0) {
                        // Move toward player if outside attack range
                        if (distance > enemy.attackRange) {
                            enemy.state = 'moving';
                            
                            let moveX = (dx / distance) * enemy.speed * deltaTime;
                            let moveY = (dy / distance) * enemy.speed * deltaTime;
                            
                            // Check collision before moving
                            const newX = enemy.x + moveX;
                            const newY = enemy.y + moveY;
                            
                            let canMoveX = true;
                            let canMoveY = true;
                            
                            const testRectX = { x: newX, y: enemy.y, width: enemy.width, height: enemy.height };
                            const testRectY = { x: enemy.x, y: newY, width: enemy.width, height: enemy.height };
                            
                            for (const obj of this.collisionObjects) {
                                if (canMoveX && this.checkCollision(testRectX, obj)) canMoveX = false;
                                if (canMoveY && this.checkCollision(testRectY, obj)) canMoveY = false;
                            }
                            
                            if (canMoveX) enemy.x = newX;
                            if (canMoveY) enemy.y = newY;
                        } else {
                            // In range but on cooldown - stay idle
                            enemy.state = 'idle';
                        }
                    }
                } else {
                    // Player not in range, idle
                    enemy.state = 'idle';
                }
            }
            
            // Update animation frames (for living enemies only - dead enemies handled at start of loop)
            if (enemy.state === 'idle') {
                if (enemy.frameTime >= enemy.frameDuration) {
                    enemy.frameTime = 0;
                    enemy.currentFrame = (enemy.currentFrame + 1) % enemy.idleFrames;
                }
            } else if (enemy.state === 'moving') {
                if (enemy.frameTime >= enemy.moveFrameDuration || (enemy.type === 'yellowArcher' && enemy.frameTime >= enemy.runFrameDuration)) {
                    enemy.frameTime = 0;
                    const moveFrames = enemy.type === 'yellowArcher' ? enemy.runFrames : enemy.moveFrames;
                    enemy.currentFrame = (enemy.currentFrame + 1) % moveFrames;
                }
            } else if (enemy.state === 'shooting' && enemy.type === 'yellowArcher') {
                // Yellow Archer shooting animation
                if (enemy.frameTime >= enemy.shootFrameDuration) {
                    enemy.frameTime = 0;
                    
                    // Create arrow at frame 4 (midway through 8 frame animation)
                    if (enemy.currentFrame === 4 && !enemy.arrowCreated) {
                        console.log('🏹 Yellow Archer shooting arrow at frame 4');
                        this.createEnemyArrow(enemy);
                        enemy.arrowCreated = true;
                    }
                    
                    // Advance frame
                    if (enemy.currentFrame < enemy.shootFrames - 1) {
                        enemy.currentFrame++;
                    } else {
                        // Animation finished, return to idle
                        enemy.state = 'idle';
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                    }
                }
            } else if (enemy.state === 'blocking' && enemy.type === 'yellowKnight') {
                // Yellow Knight blocking animation
                if (enemy.frameTime >= enemy.blockFrameDuration) {
                    enemy.frameTime = 0;
                    enemy.currentFrame = (enemy.currentFrame + 1) % enemy.blockFrames;
                }
            } else if (enemy.state === 'hurt' && enemy.type === 'blueGolem') {
                // Blue Golem hurt animation
                if (enemy.frameTime >= enemy.hurtFrameDuration) {
                    enemy.frameTime = 0;
                    if (enemy.currentFrame < enemy.hurtFrames - 1) {
                        enemy.currentFrame++;
                    } else {
                        // Hurt animation finished
                        enemy.currentFrame = 0;
                        enemy.frameTime = 0;
                        if (enemy.hurtTimer <= 0) {
                            enemy.isHurt = false;
                            enemy.state = 'idle';
                        }
                    }
                }
            } else if (enemy.state === 'walking' && enemy.type === 'blueGolem') {
                // Blue Golem walking animation
                if (enemy.frameTime >= enemy.walkFrameDuration) {
                    enemy.frameTime = 0;
                    enemy.currentFrame = (enemy.currentFrame + 1) % enemy.walkFrames;
                }
            } else if (enemy.state === 'dying' && enemy.type === 'blueGolem') {
                // Blue Golem death animation
                if (enemy.frameTime >= enemy.dieFrameDuration) {
                    enemy.frameTime = 0;
                    if (enemy.currentFrame < enemy.dieFrames - 1) {
                        enemy.currentFrame++;
                    }
                }
            } else if (enemy.state === 'attacking') {
                // Blue Golem attack damage check - check every frame while on frame 8 (attack hit frame)
                if (enemy.type === 'blueGolem' && enemy.currentFrame === 8 && !enemy.hasDealtDamage) {
                    // Trigger earthquake screen shake at the exact moment of attack (frame 8 sprite)
                    this.triggerScreenShake(0.3, 8); // Strong earthquake shake (0.3s duration, intensity 8)
                    
                    const charCenterX = this.character.x + this.character.width / 2;
                    const charCenterY = this.character.y + this.character.height / 2;
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;
                    
                    // Calculate cone attack check
                    const coneLength = enemy.coneAttackLength || 200;
                    const coneAngle = enemy.coneAttackAngle || Math.PI / 3; // 60 degrees
                    
                    // Calculate direction from enemy to player
                    const toPlayerX = charCenterX - enemyCenterX;
                    const toPlayerY = charCenterY - enemyCenterY;
                    const toPlayerDistance = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
                    
                    // Check if player is within cone range
                    let isInCone = false;
                    if (toPlayerDistance <= coneLength && !this.character.isDead) {
                        // Calculate enemy facing direction
                        const enemyDirX = enemy.facingRight ? 1 : -1;
                        const enemyDirY = 0;
                        
                        // Normalize direction to player
                        const toPlayerNormX = toPlayerX / toPlayerDistance;
                        const toPlayerNormY = toPlayerY / toPlayerDistance;
                        
                        // Calculate angle between enemy facing direction and direction to player
                        const dotProduct = enemyDirX * toPlayerNormX + enemyDirY * toPlayerNormY;
                        const angleToPlayer = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
                        
                        // Check if angle is within cone
                        if (angleToPlayer <= coneAngle / 2) {
                            isInCone = true;
                        }
                    }
                    
                    if (isInCone) {
                        const actualDamage = this.calculateDamageTaken(enemy.attackDamage);
                        this.character.health -= actualDamage;
                        this.character.lastDamageTime = 0; // Reset regen timer on damage
                        console.log(`Player hit by Blue Golem! Damage: ${actualDamage}, Health: ${this.character.health}`);
                        this.createDamagePopup(charCenterX, charCenterY, actualDamage);
                        
                        // Trigger hurt animation
                        if (this.character.health > 0) {
                            this.character.isHurt = true;
                            this.character.hurtTimer = 0.4;
                            this.character.currentFrame = 0;
                            this.character.frameTime = 0;
                        }
                        
                        if (this.character.health <= 0) {
                            this.character.health = 0;
                            this.character.isDead = true;
                            console.log('Player defeated!');
                        }
                    }
                    
                    enemy.hasDealtDamage = true; // Mark damage as dealt to prevent multiple hits
                }
                
                if (enemy.frameTime >= enemy.attackFrameDuration) {
                    enemy.frameTime = 0;
                    
                    // Advance frame first
                    if (enemy.currentFrame < enemy.attackFrames - 1) {
                        enemy.currentFrame++;
                    } else {
                        // Animation finished - stay on last frame until timer expires
                        // Keep state as 'attacking' so it keeps rendering the last attack frame
                        if (enemy.type === 'archer') {
                            enemy.arrowCreated = false; // Reset for next attack
                        }
                        if (enemy.type === 'blueGolem') {
                            enemy.hasDealtDamage = false; // Reset damage flag
                        }
                    }
                    
                    // Create arrow at frame 10 (only for archers) - check AFTER advancing frame
                    if (enemy.type === 'archer' && enemy.currentFrame >= 10 && enemy.currentFrame <= 11 && !enemy.arrowCreated) {
                        console.log(`🏹 Orc Archer shooting arrow at frame ${enemy.currentFrame}`);
                        this.createEnemyArrow(enemy);
                        enemy.arrowCreated = true;
                    }
                }
            }
        }
    }
    
    createEnemyArrow(enemy) {
        if (!this.arrowSpritesLoaded) {
            console.warn('Arrow sprites not loaded yet');
            return;
        }
        
        // Calculate direction to player
        const dx = this.character.x - enemy.x;
        const dy = this.character.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const shootDir = {
            x: dx / distance,
            y: dy / distance
        };
        
        const arrowSpeed = 400 * 1.35; // 35% faster than player arrows (540 pixels per second)
        
        // Determine arrow dimensions and direction (same logic as player arrows)
        const absX = Math.abs(shootDir.x);
        const absY = Math.abs(shootDir.y);
        const isDiagonal = absX > 0.3 && absY > 0.3;
        
        const shootingUp = shootDir.y < 0;
        const shootingDown = shootDir.y > 0;
        const shootingLeft = shootDir.x < 0;
        const shootingRight = shootDir.x > 0;
        
        let width, height, sprite, flipVertical, flipHorizontal;
        
        if (isDiagonal) {
            width = 12;
            height = 14;
            if (shootingRight) {
                sprite = this.arrowDiagonalRightSprite;
                flipVertical = shootingDown;
                flipHorizontal = false;
            } else {
                sprite = this.arrowDiagonalLeftSprite;
                flipVertical = shootingDown;
                flipHorizontal = false;
            }
        } else if (absY > absX) {
            width = 3;
            height = 14;
            sprite = this.arrowDownSprite;
            flipVertical = shootingUp;
            flipHorizontal = false;
        } else {
            width = 14;
            height = 3;
            sprite = this.arrowLeftSprite;
            flipVertical = false;
            flipHorizontal = !shootingLeft;
        }
        
        if (!sprite) {
            console.error('Enemy arrow sprite is null! Cannot create arrow.');
            return;
        }
        
        const arrow = {
            x: enemy.x + enemy.width / 2 - width / 2,
            y: enemy.y + enemy.height / 2 - height / 2,
            width: width,
            height: height,
            vx: shootDir.x * arrowSpeed,
            vy: shootDir.y * arrowSpeed,
            sprite: sprite,
            shootingUp: shootingUp,
            shootingLeft: shootingLeft,
            flipVertical: flipVertical,
            flipHorizontal: flipHorizontal,
            lifetime: 3.0,
            isEnemyArrow: true
        };
        
        this.enemyArrows.push(arrow);
        console.log('Enemy arrow created, total:', this.enemyArrows.length);
    }
    
    drawPlayerHealthBar() {
        const barWidth = 240;
        const barHeight = 28;
        const barX = 10; // 10 pixels from left
        const barY = 10; // 10 pixels from top
        
        const healthPercent = Math.max(0, this.character.health / this.character.maxHealth);
        
        // Old-school 2D style health bar with pixelated look
        
        // Outer shadow/depth effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(barX + 3, barY + 3, barWidth, barHeight);
        
        // Main background frame (dark brown/black with bevel)
        const bgGradient = this.ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        bgGradient.addColorStop(0, '#2a1a0a');
        bgGradient.addColorStop(0.5, '#1a0f05');
        bgGradient.addColorStop(1, '#0f0804');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Inner frame (lighter border)
        this.ctx.strokeStyle = '#4a3a2a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX + 2, barY + 2, barWidth - 4, barHeight - 4);
        
        // Health bar background (dark red)
        const healthBgX = barX + 4;
        const healthBgY = barY + 4;
        const healthBgWidth = barWidth - 8;
        const healthBgHeight = barHeight - 8;
        
        this.ctx.fillStyle = '#3a0000';
        this.ctx.fillRect(healthBgX, healthBgY, healthBgWidth, healthBgHeight);
        
        // Health fill with gradient (bright red to darker red)
        if (healthPercent > 0) {
            const healthFillWidth = healthBgWidth * healthPercent;
            const healthGradient = this.ctx.createLinearGradient(healthBgX, healthBgY, healthBgX + healthFillWidth, healthBgY);
            
            // Color changes based on health percentage
            if (healthPercent > 0.6) {
                // Green to yellow (healthy)
                healthGradient.addColorStop(0, '#4aff00');
                healthGradient.addColorStop(1, '#7aff30');
            } else if (healthPercent > 0.3) {
                // Yellow to orange (warning)
                healthGradient.addColorStop(0, '#ffaa00');
                healthGradient.addColorStop(1, '#ff8800');
            } else {
                // Orange to red (critical)
                healthGradient.addColorStop(0, '#ff4400');
                healthGradient.addColorStop(1, '#cc0000');
            }
            
            this.ctx.fillStyle = healthGradient;
            this.ctx.fillRect(healthBgX, healthBgY, healthFillWidth, healthBgHeight);
            
            // Pixelated scanline effect (old-school look)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < healthBgHeight; i += 2) {
                this.ctx.fillRect(healthBgX, healthBgY + i, healthFillWidth, 1);
            }
        }
        
        // Outer border highlight (top and left)
        this.ctx.strokeStyle = '#6a5a4a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(barX, barY);
        this.ctx.lineTo(barX + barWidth, barY);
        this.ctx.lineTo(barX + barWidth, barY + barHeight);
        this.ctx.stroke();
        
        // Inner border shadow (bottom and right)
        this.ctx.strokeStyle = '#1a0f05';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(barX + 1, barY + barHeight - 1);
        this.ctx.lineTo(barX + barWidth - 1, barY + barHeight - 1);
        this.ctx.lineTo(barX + barWidth - 1, barY + 1);
        this.ctx.stroke();
        
        // Health text with outline (old-school pixel font style)
        this.ctx.font = 'bold 13px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const healthText = `HP: ${Math.ceil(this.character.health)}/${this.character.maxHealth}`;
        
        // Text shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillText(healthText, barX + barWidth / 2 + 1, barY + barHeight / 2 + 1);
        
        // Main text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(healthText, barX + barWidth / 2, barY + barHeight / 2);
        
        this.ctx.textAlign = 'left';
    }
    
    // Draw quest objectives (supports up to 3 objectives)
    drawQuestObjective() {
        // Filter active objectives (max 3)
        const activeObjectives = this.questObjectives.filter(obj => obj.active).slice(0, 3);
        if (activeObjectives.length === 0) return;
        
        const objX = 10; // Same X as health bar
        const startY = 72; // Below XP bar (XP bar ends at ~65px, so 72px for spacing)
        const objWidth = 300; // Width for background (matches XP bar width)
        const objHeight = 22; // Height for each objective
        const objSpacing = 2; // Spacing between objectives
        const borderRadius = 6;
        const padding = 8;
        
        // Draw each objective
        activeObjectives.forEach((objective, index) => {
            const objY = startY + (index * (objHeight + objSpacing));
            
            // Draw shadow for depth
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.drawRoundedRect(objX + 2, objY + 2, objWidth, objHeight, borderRadius);
            this.ctx.fill();
            
            // Draw parchment-style background with gradient
            const gradient = this.ctx.createLinearGradient(objX, objY, objX, objY + objHeight);
            gradient.addColorStop(0, 'rgba(245, 235, 200, 0.95)'); // Light parchment
            gradient.addColorStop(1, 'rgba(235, 215, 165, 0.95)'); // Darker parchment
            
            // Draw rounded rectangle background
            this.ctx.fillStyle = gradient;
            this.drawRoundedRect(objX, objY, objWidth, objHeight, borderRadius);
            this.ctx.fill();
            
            // Draw decorative border
            // Outer border - dark brown
            this.ctx.strokeStyle = 'rgba(101, 67, 33, 1)'; // Dark brown
            this.ctx.lineWidth = 3;
            this.drawRoundedRect(objX, objY, objWidth, objHeight, borderRadius);
            this.ctx.stroke();
            
            // Inner border - lighter brown
            this.ctx.strokeStyle = 'rgba(139, 90, 43, 0.7)'; // Medium brown
            this.ctx.lineWidth = 1.5;
            this.drawRoundedRect(objX + 1.5, objY + 1.5, objWidth - 3, objHeight - 3, borderRadius - 1);
            this.ctx.stroke();
            
            // Draw quest icon/indicator (small decorative element)
            this.ctx.fillStyle = 'rgba(139, 90, 43, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(objX + padding, objY + objHeight / 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw objective text with shadow - dark brown and bold
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Shadow
            this.ctx.font = 'bold 11px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            
            // Truncate text if too long to fit
            let displayText = objective.text;
            const maxTextWidth = objWidth - padding * 2 - 16; // Account for icon and padding
            this.ctx.fillText(displayText, objX + padding + 8, objY + objHeight / 2 + 1);
            const textWidth = this.ctx.measureText(displayText).width;
            if (textWidth > maxTextWidth) {
                // Truncate with ellipsis
                while (this.ctx.measureText(displayText + '...').width > maxTextWidth && displayText.length > 0) {
                    displayText = displayText.slice(0, -1);
                }
                displayText += '...';
            }
            
            this.ctx.fillText(displayText, objX + padding + 8, objY + objHeight / 2 + 1);
            
            this.ctx.fillStyle = 'rgba(80, 50, 20, 1)'; // Dark brown text
            this.ctx.fillText(displayText, objX + padding + 8, objY + objHeight / 2);
        });
    }
    
    // Draw NPC dialog box (speech bubble above NPC)
    drawNPCDialog() {
        // Check boss quest NPC first
        let npc = null;
        let npcType = null;
        
        if (this.bossQuestNPC && this.bossQuestNPC.isTalking) {
            npc = this.bossQuestNPC;
            npcType = 'bossQuestNPC';
        } else if (this.questNPC && this.questNPC.isTalking) {
            npc = this.questNPC;
            npcType = 'questNPC';
        }
        
        if (!npc || !npc.isTalking) return;
        
        const messages = npc.currentDialogMessages || npc.dialogMessages;
        if (npc.dialogIndex >= messages.length) return;
        
        const dialogText = messages[npc.dialogIndex];
        const dialogWidth = Math.min(350, this.canvas.width - 40);
        
        // Calculate NPC position on screen
        const npcScreenX = npc.x - this.camera.x;
        const npcScreenY = npc.y - this.camera.y;
        
        // Position dialog above NPC (centered above NPC)
        const dialogX = npcScreenX + (npc.width / 2) - (dialogWidth / 2);
        const dialogY = npcScreenY - 140; // 140 pixels above NPC (room for dialog + pointer)
        
        // Make sure dialog stays on screen
        const clampedX = Math.max(10, Math.min(dialogX, this.canvas.width - dialogWidth - 10));
        const clampedY = Math.max(10, dialogY); // Don't go above screen
        
        const borderRadius = 8;
        const padding = 15;
        
        // Calculate dialog height based on text - need to set font first
        this.ctx.font = 'bold 16px Arial'; // Match the rendering font for accurate measurement
        const words = dialogText.split(' ');
        let line = '';
        let lineCount = 1;
        const maxWidth = dialogWidth - (padding * 2) - 10; // Account for padding on both sides
        const lineHeight = 22;
        
        // Count lines needed - use same font as rendering
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lineCount++;
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        
        // Calculate height with proper padding: name line + spacing + text lines + bottom padding
        const nameHeight = 20; // Space for name
        const nameSpacing = 8; // Space between name and text
        const bottomPadding = padding + 30; // Bottom padding including "Tap to continue" space (increased for safety)
        // Add extra padding to ensure last line fits comfortably
        const dialogHeight = nameHeight + nameSpacing + (lineCount * lineHeight) + bottomPadding + 5;
        
        // Draw shadow for depth
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.drawRoundedRect(clampedX + 4, clampedY + 4, dialogWidth, dialogHeight, borderRadius);
        this.ctx.fill();
        
        // Draw parchment-style background with gradient
        const gradient = this.ctx.createLinearGradient(clampedX, clampedY, clampedX, clampedY + dialogHeight);
        gradient.addColorStop(0, 'rgba(245, 235, 200, 0.98)'); // Light parchment
        gradient.addColorStop(0.5, 'rgba(240, 225, 180, 0.98)'); // Medium parchment
        gradient.addColorStop(1, 'rgba(235, 215, 165, 0.98)'); // Darker parchment
        
        // Draw rounded rectangle background
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(clampedX, clampedY, dialogWidth, dialogHeight, borderRadius);
        this.ctx.fill();
        
        // Draw decorative border (double border effect)
        // Outer border - dark brown
        this.ctx.strokeStyle = 'rgba(101, 67, 33, 1)'; // Dark brown
        this.ctx.lineWidth = 4;
        this.drawRoundedRect(clampedX, clampedY, dialogWidth, dialogHeight, borderRadius);
        this.ctx.stroke();
        
        // Inner border - lighter brown
        this.ctx.strokeStyle = 'rgba(139, 90, 43, 0.8)'; // Medium brown
        this.ctx.lineWidth = 2;
        this.drawRoundedRect(clampedX + 2, clampedY + 2, dialogWidth - 4, dialogHeight - 4, borderRadius - 1);
        this.ctx.stroke();
        
        // Draw decorative corner accents
        const cornerSize = 12;
        this.ctx.strokeStyle = 'rgba(101, 67, 33, 0.6)';
        this.ctx.lineWidth = 2;
        // Top-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(clampedX + padding, clampedY + padding);
        this.ctx.lineTo(clampedX + padding + cornerSize, clampedY + padding);
        this.ctx.moveTo(clampedX + padding, clampedY + padding);
        this.ctx.lineTo(clampedX + padding, clampedY + padding + cornerSize);
        this.ctx.stroke();
        
        // Top-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(clampedX + dialogWidth - padding, clampedY + padding);
        this.ctx.lineTo(clampedX + dialogWidth - padding - cornerSize, clampedY + padding);
        this.ctx.moveTo(clampedX + dialogWidth - padding, clampedY + padding);
        this.ctx.lineTo(clampedX + dialogWidth - padding, clampedY + padding + cornerSize);
        this.ctx.stroke();
        
        // Draw NPC name (dark brown, bold) with text shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Shadow
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('Mysterious Monk', clampedX + padding + 1, clampedY + padding + 1);
        
        this.ctx.fillStyle = 'rgba(80, 50, 20, 1)'; // Dark brown text
        this.ctx.fillText('Mysterious Monk', clampedX + padding, clampedY + padding);
        
        // Draw dialog text (wrapped) - dark brown text, bold/fat with shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Text shadow
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Word wrap the text with shadow
        line = '';
        let y = clampedY + padding + 28;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                // Draw shadow
                this.ctx.fillText(line, clampedX + padding + 1, y + 1);
                // Draw text
                this.ctx.fillStyle = 'rgba(60, 40, 20, 1)'; // Dark brown
                this.ctx.fillText(line, clampedX + padding, y);
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Reset shadow color
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        // Draw last line shadow
        this.ctx.fillText(line, clampedX + padding + 1, y + 1);
        // Draw last line text
        this.ctx.fillStyle = 'rgba(60, 40, 20, 1)'; // Dark brown
        this.ctx.fillText(line, clampedX + padding, y);
        
        // Draw "Tap to continue" hint (dark brown, italic) with shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.font = 'italic 12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('Tap to continue...', clampedX + dialogWidth - padding + 1, clampedY + dialogHeight - padding + 1);
        this.ctx.fillStyle = 'rgba(80, 50, 20, 0.8)'; // Dark brown with transparency
        this.ctx.fillText('Tap to continue...', clampedX + dialogWidth - padding, clampedY + dialogHeight - padding);
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
    }
    
    createDamagePopup(x, y, damage, isBlocked = false, color = null) {
        this.damagePopups.push({
            x: x,
            y: y,
            damage: damage,
            isBlocked: isBlocked,
            color: color, // Custom color (null = use default based on isBlocked)
            lifetime: 1.0, // 1 second
            maxLifetime: 1.0,
            velocityY: -30 // Float upward
        });
    }
    
    updateDamagePopups(deltaTime) {
        for (let i = this.damagePopups.length - 1; i >= 0; i--) {
            const popup = this.damagePopups[i];
            
            // Update position (float upward)
            popup.y += popup.velocityY * deltaTime;
            
            // Update lifetime
            popup.lifetime -= deltaTime;
            
            // Remove if expired
            if (popup.lifetime <= 0) {
                this.damagePopups.splice(i, 1);
            }
        }
    }
    
    triggerScreenShake(duration, intensity) {
        this.cameraShake.duration = duration;
        this.cameraShake.intensity = intensity;
    }
    
    updateScreenShake(deltaTime) {
        if (this.cameraShake.duration > 0) {
            this.cameraShake.duration -= deltaTime;
            
            // Generate random shake offset
            const shakeAmount = this.cameraShake.intensity * (this.cameraShake.duration / 0.15); // Decay over time
            this.cameraShake.x = (Math.random() - 0.5) * shakeAmount * 2;
            this.cameraShake.y = (Math.random() - 0.5) * shakeAmount * 2;
            
            if (this.cameraShake.duration <= 0) {
                this.cameraShake.x = 0;
                this.cameraShake.y = 0;
                this.cameraShake.intensity = 0;
            }
        }
    }
    
    playEnemyDeathSound() {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Create a disappearing sound (fade out tone)
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Set frequency (mild disappearing sound)
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
            
            // Set volume (fade out)
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            // Play sound
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
            console.warn('Failed to play death sound:', e);
        }
    }
    
    checkMeleeAttackDamage() {
        // Only check damage once per attack (around middle of animation)
        if (!this.character.lastMeleeHitFrame) {
            this.character.lastMeleeHitFrame = -1;
        }
        
        // Get current attack frame (approximate based on timer)
        // Strong attacks are 15% slower (0.345s vs 0.3s)
        const isStrongAttack = this.character.attackType === 'strong';
        const attackDuration = isStrongAttack ? 0.345 : 0.3;
        const elapsed = attackDuration - this.character.attackTimer;
        const currentFrame = Math.floor((elapsed / attackDuration) * 6);
        
        // Only check damage once at frame 3 (middle of attack)
        if (currentFrame === 3 && this.character.lastMeleeHitFrame !== 3) {
            this.character.lastMeleeHitFrame = 3;
            
            // Calculate attack damage (with ability modifiers)
            let baseDamage = 0;
            if (this.character.attackType === 'basic') {
                baseDamage = this.character.baseDamage || 5; // Use character's base damage (increases with level)
            } else if (this.character.attackType === 'strong') {
                baseDamage = this.character.baseStrongDamage || 15; // Use character's base strong damage (increases with level)
            }
            const damage = this.calculateDamage(baseDamage, this.character.attackType);
            
            if (damage > 0) {
                // Check collision with enemies in melee range
                // Both basic and strong attacks have 92 pixels range
                const attackRange = 92; // Attack range for both basic and strong attacks
                const charCenterX = this.character.x + this.character.width / 2;
                const charCenterY = this.character.y + this.character.height / 2;
                
                for (const enemy of this.enemies) {
                    if (!enemy || enemy.health <= 0) continue;
                    
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;
                    
                    const dx = enemyCenterX - charCenterX;
                    const dy = enemyCenterY - charCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= attackRange) {
                        // Calculate actual damage (check for block)
                        let actualDamage = damage;
                        let isBlocked = false;
                        
                        // Check if Yellow Knight is blocking - 100% chance to block 50% damage when blocking
                        if (enemy.type === 'yellowKnight' && enemy.isBlocking) {
                            actualDamage = Math.floor(damage * 0.5); // 50% damage reduction (always blocks when in block mode)
                            isBlocked = true;
                            console.log(`Yellow Knight blocked attack! Original damage: ${damage}, Blocked damage: ${actualDamage}`);
                        }
                        
                        enemy.health -= actualDamage;
                        console.log(`Enemy hit by ${this.character.attackType} attack! Damage: ${actualDamage}${isBlocked ? ' (BLOCKED)' : ''}, Health: ${enemy.health}`);
                        
                        // Check for Blue Golem hurt animation triggers (at 25%, 50%, 75% health)
                        if (enemy.type === 'blueGolem' && enemy.hurtThresholds && enemy.hurtThresholdsUsed) {
                            const healthPercent = enemy.health / enemy.maxHealth;
                            for (let j = 0; j < enemy.hurtThresholds.length; j++) {
                                const threshold = enemy.hurtThresholds[j];
                                if (healthPercent <= threshold && !enemy.hurtThresholdsUsed.includes(threshold)) {
                                    enemy.hurtThresholdsUsed.push(threshold);
                                    enemy.isHurt = true;
                                    enemy.hurtTimer = enemy.hurtFrames * enemy.hurtFrameDuration;
                                    enemy.currentFrame = 0;
                                    enemy.frameTime = 0;
                                    console.log(`Blue Golem hurt animation triggered at ${threshold * 100}% health!`);
                                    break;
                                }
                            }
                        }
                        
                        // Create damage popup
                        this.createDamagePopup(enemy.x + enemy.width / 2, enemy.y, actualDamage, isBlocked);
                        
                        // Set enemy to death state if health <= 0
                        if (enemy.health <= 0 && !enemy.isDead) {
                            enemy.isDead = true;
                            if (enemy.type === 'blueGolem') {
                                enemy.state = 'dying';
                                enemy.deathAnimationTimer = enemy.dieFrames * enemy.dieFrameDuration; // 12 frames * 0.2s = 2.4s
                                enemy.currentFrame = 0; // Start at frame 0 for Blue Golem
                                enemy.frameTime = 0;
                            } else {
                                enemy.state = 'dying';
                                enemy.deathAnimationTimer = 1.12; // 4 frames * 0.28s = 1.12s (40% slower: 0.2s * 1.4 = 0.28s per frame)
                                enemy.currentFrame = 4; // Start at frame 4 (last 4 frames: 4, 5, 6, 7)
                                enemy.frameTime = 0;
                                enemy.deathFrameCount = 0; // Track how many death frames have played
                            }
                            console.log('Enemy defeated!');
                            
                            // Check if boss was defeated
                            if (enemy.type === 'blueGolem' && this.bossQuest.started && !this.bossQuest.bossDefeated) {
                                this.bossQuest.bossDefeated = true;
                                console.log('Blue Golem boss defeated! Return to the monk for your reward!');
                                // Show exclamation point again on boss quest NPC
                                if (this.bossQuestNPC) {
                                    this.bossQuestNPC.showExclamation = true;
                                }
                            }
                            
                            // Award XP for kill
                            this.gainXP(enemy.type || 'default');
                            
                            // Play disappearing sound effect
                            this.playEnemyDeathSound();
                        }
                    }
                }
            }
        } else if (currentFrame !== 3) {
            // Reset hit frame when not at frame 3
            this.character.lastMeleeHitFrame = -1;
        }
    }
    
    updateEnemyArrows(deltaTime) {
        for (let i = this.enemyArrows.length - 1; i >= 0; i--) {
            const arrow = this.enemyArrows[i];
            
            // Update position
            arrow.x += arrow.vx * deltaTime;
            arrow.y += arrow.vy * deltaTime;
            
            // Update lifetime
            arrow.lifetime -= deltaTime;
            
            // Remove if lifetime expired or out of bounds
            const margin = 500;
            if (arrow.lifetime <= 0 ||
                arrow.x < this.camera.x - margin ||
                arrow.x > this.camera.x + this.canvas.width + margin ||
                arrow.y < this.camera.y - margin ||
                arrow.y > this.camera.y + this.canvas.height + margin) {
                this.enemyArrows.splice(i, 1);
                continue;
            }
            
            // Check collision with walls/objects
            const arrowRect = {
                x: arrow.x,
                y: arrow.y,
                width: arrow.width,
                height: arrow.height
            };
            
            for (const obj of this.collisionObjects) {
                if (this.checkCollision(arrowRect, obj)) {
                    this.enemyArrows.splice(i, 1);
                    break;
                }
            }
            
            // Check collision with player
            const charRect = {
                x: this.character.x,
                y: this.character.y + (this.character.height * 0.5),
                width: this.character.width * 0.9,
                height: this.character.height * 0.5
            };
            
            if (this.checkCollision(arrowRect, charRect)) {
                // Hit player - deal damage (only if not already hurt or dead)
                if (!this.character.isDead && !this.character.isHurt) {
                    const arrowDamage = this.calculateDamageTaken(15); // 15 base damage per arrow
                    this.character.health -= arrowDamage;
                    this.character.lastDamageTime = 0; // Reset regen timer on damage
                    if (this.character.health < 0) {
                        this.character.health = 0;
                    }
                    console.log('Player hit by enemy arrow! Damage:', arrowDamage, 'Health:', this.character.health);
                    
                    // Mild screen shake AND hurt animation
                    this.triggerScreenShake(0.15, 3);
                    
                    // Trigger hurt animation
                    if (this.character.health > 0) {
                        this.character.isHurt = true;
                        this.character.hurtTimer = 0.4; // 4 frames * 0.1s
                        this.character.currentFrame = 0;
                        this.character.frameTime = 0;
                        // Disable other actions
                        this.character.isDashing = false;
                        this.character.attackType = null;
                        this.character.attackTimer = 0;
                    } else {
                        // Player died
                        this.character.isDead = true;
                        this.character.deathTimer = 1.6; // 8 frames * 0.2s (50% slower)
                        this.character.currentFrame = 0;
                        this.character.frameTime = 0;
                        // Disable all actions
                        this.character.isDashing = false;
                        this.character.attackType = null;
                        this.character.attackTimer = 0;
                    }
                }
                this.enemyArrows.splice(i, 1);
            }
        }
    }

    performDash() {
        console.log('GameEngine.performDash called', {
            dashCooldown: this.character.dashCooldown,
            isDashing: this.character.isDashing,
            isHurt: this.character.isHurt,
            isDead: this.character.isDead
        });
        
        // Don't allow dash when dead (can dash while hurt)
        if (this.character.isDead) {
            console.log('Dash blocked: character is dead');
            return;
        }
        
        // Check if dash is on cooldown or already dashing
        if (this.character.dashCooldown > 0 || this.character.isDashing) {
            console.log('Dash blocked: cooldown or already dashing');
            return;
        }
        
        // Determine dash direction based on current movement direction
        let dashX = 0;
        let dashY = 0;
        
        // First, check current movement input
        if (this.keys['w'] || this.keys['arrowup']) dashY -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dashY += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dashX -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dashX += 1;
        
        // If no current input, use last movement direction
        if (dashX === 0 && dashY === 0) {
            dashX = this.character.lastMoveDirection.x;
            dashY = this.character.lastMoveDirection.y;
        }
        
        // If still no direction (character never moved), dash in facing direction
        if (dashX === 0 && dashY === 0) {
            dashX = this.character.facingRight ? 1 : -1;
        }
        
        // Normalize diagonal dash
        if (dashX !== 0 && dashY !== 0) {
            const len = Math.sqrt(dashX * dashX + dashY * dashY);
            dashX /= len;
            dashY /= len;
        } else if (dashX !== 0 || dashY !== 0) {
            // Normalize single-axis movement
            const len = Math.abs(dashX) || Math.abs(dashY);
            dashX /= len;
            dashY /= len;
        }
        
        // Update facing direction
        if (dashX > 0) {
            this.character.facingRight = true;
        } else if (dashX < 0) {
            this.character.facingRight = false;
        }
        
        // Set dash direction
        this.character.dashDirection.x = dashX;
        this.character.dashDirection.y = dashY;
        
        // Calculate dash duration based on distance and speed
        const dashTime = this.character.dashDistance / this.character.dashSpeed;
        this.character.dashDuration = dashTime;
        this.character.isDashing = true;
        this.character.dashCooldown = this.calculateCooldown(1.0); // 1 second cooldown (affected by abilities)
        
        // Reset animation frame for dash
        this.character.currentFrame = 0;
        this.character.frameTime = 0;
    }

    start() {
        let lastTime = performance.now();
        
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;
            
            this.update(deltaTime);
            this.render();
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }

    // If the character starts overlapping collisions, try to nudge it to a nearby free location.
    ensureCharacterNotColliding() {
        if (!this.spawnPoint) return;

        const startX = this.character.x;
        const startY = this.character.y;

        if (this.canMove(startX, startY)) return; // already free

        const step = 16;
        const maxRadius = 128;

        for (let r = step; r <= maxRadius; r += step) {
            for (let dx = -r; dx <= r; dx += r) {
                for (let dy = -r; dy <= r; dy += r) {
                    const nx = startX + dx;
                    const ny = startY + dy;
                    if (this.canMove(nx, ny)) {
                        this.character.x = nx;
                        this.character.y = ny;
                        return;
                    }
                }
            }
        }
        // If still colliding, leave character at original position (can't resolve)
    }

    spawnEnemies() {
        // Clear existing enemies
        this.enemies = [];
        
        // Debug: List all object layers to see what's available
        if (this.mapLoader.mapData && this.mapLoader.mapData.layers) {
            console.log('=== Available Object Layers ===');
            for (const layer of this.mapLoader.mapData.layers) {
                if (layer.type === 'objectgroup') {
                    console.log(`- "${layer.name}" (${layer.objects ? layer.objects.length : 0} objects, visible: ${layer.visible !== false})`);
                    // List objects with gid in this layer
                    if (layer.objects) {
                        for (const obj of layer.objects) {
                            if (obj.gid) {
                                const tilesetInfo = this.mapLoader.getTilesetForTile(obj.gid);
                                const tsName = tilesetInfo ? (tilesetInfo.tileset.name || 'unknown') : 'NO TILESET';
                                console.log(`    Object: name="${obj.name || 'unnamed'}", gid=${obj.gid}, pos=(${obj.x}, ${obj.y}), tileset="${tsName}"`);
                            }
                        }
                    }
                }
            }
        }
        
        // Get spawn points for "Monster 1 Spawn Points" (enemies level 1)
        const spawnPoints = this.mapLoader.getEnemySpawnPoints('Monster 1 Spawn Points');
        
        console.log(`Looking for "Monster 1 Spawn Points" layer...`);
        console.log(`Found ${spawnPoints.length} spawn points`);
        
        if (spawnPoints.length > 0) {
            console.log(`✓ Found ${spawnPoints.length} enemy spawn points, spawning enemies...`);
            
            // Spawn an enemy at each spawn point - randomize between archer and orc barbarian
            for (let i = 0; i < spawnPoints.length; i++) {
                const spawnPoint = spawnPoints[i];
                // Randomly choose enemy type (50% archer, 50% orc barbarian)
                const enemyType = Math.random() < 0.5 ? 'archer' : 'orcBarbarian';
                
                let enemyY; // Declare outside if/else for logging
                
                if (enemyType === 'archer') {
                    // Tiled places object Y at bottom, but we want top-left for enemies
                    enemyY = spawnPoint.y - 84; // Adjust for enemy height (84 pixels, 15% smaller)
                    
                    this.enemies.push({
                        type: 'archer', // Enemy type identifier
                        x: spawnPoint.x,
                        y: enemyY,
                        width: 151, // Enemy sprite width (178 * 0.85 = 151.3, rounded to 151)
                        height: 84, // Enemy sprite height (99 * 0.85 = 84.15, rounded to 84)
                        color: '#ff00ff', // Magenta color for enemies
                        speed: 100, // Movement speed
                        health: 5,
                        maxHealth: 5, // Store max health for health bar
                        attackDamage: 0, // Archers don't deal melee damage
                        // Animation properties
                        currentFrame: 0,
                        frameTime: 0,
                        isDead: false, // Death state
                        deathAnimationTimer: 0, // Timer for death animation
                        idleFrames: 2,
                        moveFrames: 6,
                        attackFrames: 18,
                        frameDuration: 0.3, // Idle frame duration
                        moveFrameDuration: 0.15, // Move frame duration
                        attackFrameDuration: 0.05, // Attack frame duration
                        // State
                        state: 'idle', // 'idle', 'moving', 'attacking'
                        facingRight: true,
                        attackCooldown: 0,
                        attackTimer: 0,
                        lastAttackTime: 0,
                        attackRange: 500, // Attack range in pixels (increased for ranged combat)
                        minRange: 200, // Minimum range - try to stay at least this far
                        maxRange: 400, // Maximum range - try to stay within this
                        detectionRange: 600 // Detection range in pixels (increased)
                    });
                } else {
                    // Orc Barbarian - melee enemy, faster than character
                    // 40% larger: 84 * 1.4 = 117.6, round to 118
                    enemyY = spawnPoint.y - 118; // Orc Barbarian height is 118 pixels (40% larger than archers)
                    
                    this.enemies.push({
                        type: 'orcBarbarian', // Enemy type identifier
                        x: spawnPoint.x,
                        y: enemyY,
                        width: 80, // Orc Barbarian sprite width (57 * 1.4 = 79.8, round to 80)
                        height: 118, // Orc Barbarian sprite height (84 * 1.4 = 117.6, round to 118)
                        color: '#8B4513', // Brown color for Orc Barbarian
                        speed: 150, // Movement speed (faster than character, which is typically 100-120)
                        health: 30,
                        maxHealth: 30, // Store max health for health bar
                        attackDamage: 7, // Attack damage
                        // Animation properties
                        currentFrame: 0,
                        frameTime: 0,
                        idleFrames: 2, // Use move sprite for idle (no separate idle sprite)
                        moveFrames: 5,
                        attackFrames: 12,
                        frameDuration: 0.3, // Idle frame duration
                        moveFrameDuration: 0.15, // Move frame duration
                        attackFrameDuration: 0.1, // Attack frame duration
                        // State
                        state: 'idle', // 'idle', 'moving', 'attacking'
                        facingRight: true,
                        attackCooldown: 0,
                        attackTimer: 0,
                        lastAttackTime: 0,
                        attackRange: 70, // Melee attack range
                        detectionRange: 400 // Detection range in pixels
                    });
                }
                
                // Log first 3 enemies for debugging
                if (i < 3) {
                    console.log(`Enemy ${i + 1} spawned at: (${spawnPoint.x}, ${spawnPoint.y}) -> adjusted to (${spawnPoint.x}, ${enemyY})`);
                }
            }
            
            console.log(`✓ Spawned ${spawnPoints.length} archer enemies at level 1 spawn points`);
        }
        
        // Get spawn points for "Yellow Knights Spawn Point" (Yellow Knights)
        const yellowKnightSpawnPoints = this.mapLoader.getEnemySpawnPoints('Yellow Knights Spawn Point');
        
        console.log(`Looking for "Yellow Knights Spawn Point" layer...`);
        console.log(`Found ${yellowKnightSpawnPoints.length} spawn points`);
        
        if (yellowKnightSpawnPoints.length > 0) {
            console.log(`✓ Found ${yellowKnightSpawnPoints.length} Yellow Knight spawn points, spawning enemies...`);
            
            // Spawn a Yellow Knight at each spawn point
            for (let i = 0; i < yellowKnightSpawnPoints.length; i++) {
                const spawnPoint = yellowKnightSpawnPoints[i];
                // Tiled places object Y at bottom, but we want top-left for enemies
                const enemyY = spawnPoint.y - 140; // Yellow Knight height is 140 pixels
                
                this.enemies.push({
                    type: 'yellowKnight', // Enemy type identifier
                    x: spawnPoint.x,
                    y: enemyY,
                    width: 140, // Yellow Knight sprite width (scaled from 192x192 to 140x140)
                    height: 140, // Yellow Knight sprite height
                    color: '#ffff00', // Yellow color for Yellow Knights
                    speed: 80, // Movement speed (slightly slower than archers)
                        health: 40,
                        maxHealth: 40, // Store max health for health bar
                        attackDamage: 5, // Attack damage
                        // Animation properties
                        currentFrame: 0,
                        frameTime: 0,
                        isDead: false, // Death state
                        deathAnimationTimer: 0, // Timer for death animation
                    idleFrames: 8,
                    moveFrames: 6,
                    attackFrames: 4,
                    blockFrames: 6,
                    frameDuration: 0.15, // Idle frame duration
                    moveFrameDuration: 0.15, // Move frame duration
                    attackFrameDuration: 0.2, // Attack frame duration
                    blockFrameDuration: 0.15, // Block frame duration
                    // State
                    state: 'idle', // 'idle', 'moving', 'attacking', 'blocking'
                    facingRight: true,
                    attackCooldown: 0,
                    attackTimer: 0,
                    blockTimer: 0, // Timer for how long to block
                    isBlocking: true, // Whether currently blocking - Yellow Knights always start blocking
                    lastAttackTime: 0,
                    attackRange: 55, // Melee attack range - Yellow Knight must get this close before attacking
                    attackHitRange: 80, // Actual hit range for damage application (larger to ensure hits connect)
                    detectionRange: 300, // Detection range in pixels
                    blockChance: 0.3, // 30% chance to block when attacked
                    blockDuration: 2.0 // Block duration in seconds
                });
                
                // Log first 3 enemies for debugging
                if (i < 3) {
                    console.log(`Yellow Knight ${i + 1} spawned at: (${spawnPoint.x}, ${spawnPoint.y}) -> adjusted to (${spawnPoint.x}, ${enemyY})`);
                }
            }
            
            console.log(`✓ Spawned ${yellowKnightSpawnPoints.length} Yellow Knight enemies`);
        }
        
        // Get spawn points for "Yellow Archers Spawn Point" (Yellow Archers)
        const yellowArcherSpawnPoints = this.mapLoader.getEnemySpawnPoints('Yellow Archers Spawn Point');
        
        console.log(`Looking for "Yellow Archers Spawn Point" layer...`);
        console.log(`Found ${yellowArcherSpawnPoints.length} spawn points`);
        
        if (yellowArcherSpawnPoints.length > 0) {
            console.log(`✓ Found ${yellowArcherSpawnPoints.length} Yellow Archer spawn points, spawning enemies...`);
            
            // Spawn a Yellow Archer at each spawn point
            for (let i = 0; i < yellowArcherSpawnPoints.length; i++) {
                const spawnPoint = yellowArcherSpawnPoints[i];
                // Tiled places object Y at bottom, but we want top-left for enemies
                const enemyY = spawnPoint.y - 140; // Yellow Archer height is 140 pixels (same as yellow knight)
                
                this.enemies.push({
                    type: 'yellowArcher', // Enemy type identifier
                    x: spawnPoint.x,
                    y: enemyY,
                    width: 140, // Yellow Archer sprite width (scaled from 192x192 to 140x140)
                    height: 140, // Yellow Archer sprite height
                    color: '#ffff00', // Yellow color for Yellow Archers
                    speed: 90, // Movement speed (slightly faster than yellow knight)
                    health: 10,
                    maxHealth: 10, // Store max health for health bar
                    attackDamage: 10, // Attack damage
                    // Animation properties
                    currentFrame: 0,
                    frameTime: 0,
                    isDead: false, // Death state
                    deathAnimationTimer: 0, // Timer for death animation
                    idleFrames: 6,
                    runFrames: 4,
                    shootFrames: 8,
                    frameDuration: 0.15, // Idle frame duration
                    runFrameDuration: 0.15, // Run frame duration
                    shootFrameDuration: 0.1, // Shoot frame duration
                    // State
                    state: 'idle', // 'idle', 'moving', 'shooting'
                    facingRight: true,
                    attackCooldown: 0,
                    attackTimer: 0,
                    shootTimer: 0, // Timer for shooting animation
                    lastAttackTime: 0,
                    attackRange: 400, // Ranged attack range
                    detectionRange: 350, // Detection range in pixels
                    shootCooldown: 2.0 // Cooldown between shots in seconds
                });
                
                // Log first 3 enemies for debugging
                if (i < 3) {
                    console.log(`Yellow Archer ${i + 1} spawned at: (${spawnPoint.x}, ${spawnPoint.y}) -> adjusted to (${spawnPoint.x}, ${enemyY})`);
                }
            }
            
            console.log(`✓ Spawned ${yellowArcherSpawnPoints.length} Yellow Archer enemies`);
        }
        
        // Get spawn points for "Boss Level 1" (Blue Golem Boss)
        const bossLevel1SpawnPoints = this.mapLoader.getEnemySpawnPoints('Boss Level 1');
        
        console.log(`Looking for "Boss Level 1" layer...`);
        console.log(`Found ${bossLevel1SpawnPoints.length} spawn points`);
        
        if (bossLevel1SpawnPoints.length > 0) {
            console.log(`✓ Found ${bossLevel1SpawnPoints.length} Blue Golem boss spawn points, spawning boss...`);
            
            // Spawn Blue Golem Boss at each spawn point
            for (let i = 0; i < bossLevel1SpawnPoints.length; i++) {
                const spawnPoint = bossLevel1SpawnPoints[i];
                // Tiled places object Y at bottom, but we want top-left for enemies
                // Blue Golem scaled size: 126x90 * 1.40 = 176.4x126, round to 176x126
                const enemyY = spawnPoint.y - 126; // Blue Golem height is 126 pixels
                
                this.enemies.push({
                    type: 'blueGolem', // Enemy type identifier
                    x: spawnPoint.x,
                    y: enemyY,
                    width: 176, // Blue Golem sprite width (126 * 1.40 = 176.4, rounded to 176)
                    height: 126, // Blue Golem sprite height (90 * 1.40 = 126)
                    color: '#0066ff', // Blue color for Blue Golem
                    speed: 100, // Boss movement speed
                    health: 250,
                    maxHealth: 250, // Store max health for health bar
                    attackDamage: 20, // Attack damage
                    // Animation properties
                    currentFrame: 0,
                    frameTime: 0,
                    isDead: false, // Death state
                    deathAnimationTimer: 0, // Timer for death animation
                    idleFrames: 8,
                    walkFrames: 10,
                    attackFrames: 11,
                    dieFrames: 12,
                    hurtFrames: 4,
                    frameDuration: 0.15, // Idle frame duration
                    walkFrameDuration: 0.15, // Walk frame duration
                    attackFrameDuration: 0.15, // Attack frame duration
                    dieFrameDuration: 0.2, // Die frame duration
                    hurtFrameDuration: 0.1, // Hurt frame duration
                    // State
                    state: 'idle', // 'idle', 'walking', 'attacking', 'hurt', 'dying'
                    facingRight: true,
                    attackCooldown: 0,
                    attackTimer: 0,
                    hurtTimer: 0, // Timer for hurt animation
                    isHurt: false, // Whether currently showing hurt animation
                    lastAttackTime: 0,
                    attackRange: 100, // Melee attack range (for backwards compatibility)
                    coneAttackLength: 200, // Cone attack length in pixels
                    coneAttackAngle: Math.PI / 3, // 60 degrees cone angle
                    detectionRange: 500, // Detection range in pixels (boss should detect from far away)
                    // Hurt animation triggers at 25%, 50%, 75% health
                    hurtThresholds: [0.75, 0.50, 0.25], // Health percentages that trigger hurt
                    hurtThresholdsUsed: [] // Track which thresholds have been used
                });
                
                console.log(`Blue Golem Boss ${i + 1} spawned at: (${spawnPoint.x}, ${spawnPoint.y}) -> adjusted to (${spawnPoint.x}, ${enemyY})`);
            }
            
            console.log(`✓ Spawned ${bossLevel1SpawnPoints.length} Blue Golem Boss enemies`);
        }
        
        // Create Boss Quest NPC at the bottom-left spawn point (highest Y, lowest X)
        // Find the bottom-left spawn point from all yellow archer/knight spawn points
        let bossQuestNPCPosition = null;
        let allSpawnPoints = [];
        
        // Combine all yellow spawn points
        if (yellowArcherSpawnPoints.length > 0) {
            allSpawnPoints = allSpawnPoints.concat(yellowArcherSpawnPoints);
        }
        if (yellowKnightSpawnPoints.length > 0) {
            allSpawnPoints = allSpawnPoints.concat(yellowKnightSpawnPoints);
        }
        
        if (allSpawnPoints.length > 0) {
            // Find bottom-left spawn point (highest Y value, then lowest X value if tied)
            let bottomLeftSpawnPoint = allSpawnPoints[0];
            for (const spawnPoint of allSpawnPoints) {
                // Higher Y = more bottom (in screen coordinates)
                if (spawnPoint.y > bottomLeftSpawnPoint.y || 
                    (spawnPoint.y === bottomLeftSpawnPoint.y && spawnPoint.x < bottomLeftSpawnPoint.x)) {
                    bottomLeftSpawnPoint = spawnPoint;
                }
            }
            
            bossQuestNPCPosition = {
                x: bottomLeftSpawnPoint.x - 50 + 150, // 50 pixels to the left, then 150 pixels to the right = 100 pixels to the right of spawn point
                y: bottomLeftSpawnPoint.y + (bottomLeftSpawnPoint.height || 0) / 2 - 65 - 35 // Center vertically, then 35 pixels north (up)
            };
        }
        
        if (bossQuestNPCPosition) {
            this.bossQuestNPC = {
                x: bossQuestNPCPosition.x,
                y: bossQuestNPCPosition.y,
                width: 130, // Scaled down from 192x192 to 130x130
                height: 130,
                idleFrames: 6, // 6 frames for idle animation
                currentFrame: 0,
                frameTime: 0,
                frameDuration: 0.2, // 0.2 seconds per frame (5 fps for idle)
                // Dialog system
                showExclamation: true, // Show exclamation point until talked to
                isTalking: false, // Is dialog active
                dialogIndex: 0, // Current dialog message index
                dialogMessages: [
                    "Ah, brave warrior! I have an important quest for you.",
                    "A terrible Blue Golem guards this territory.",
                    "It terrorizes the local settlements and must be stopped!",
                    "Defeat the Boss Of the Territory and return to me for a great reward!"
                ],
                completionDialogMessages: [
                    "Incredible! You've defeated the Blue Golem!",
                    "As promised, here is your reward. You've earned 1000 XP!"
                ]
            };
            console.log('Boss Quest NPC created at:', this.bossQuestNPC.x, this.bossQuestNPC.y);
        }
        
        console.log(`✓ Total enemies spawned: ${this.enemies.length}`);
        console.log(`Character position: (${this.character.x}, ${this.character.y})`);
        if (this.enemies.length > 0) {
            console.log(`First enemy position: (${this.enemies[0]?.x}, ${this.enemies[0]?.y})`);
        }
    }
    
    // XP and Level System Methods
    gainXP(enemyType) {
        if (this.isAbilityChoiceOpen) return; // Don't gain XP while choosing ability
        
        const xpGained = this.xpSystem.xpRewards[enemyType] || this.xpSystem.xpRewards.default;
        this.xpSystem.currentXP += xpGained;
        
        console.log(`+${xpGained} XP! Total: ${this.xpSystem.currentXP}`);
        
        // Check for level up
        this.checkLevelUp();
        
        // Vampiric ability: heal on kill
        if (this.abilities.vampiric) {
            this.character.health = Math.min(this.character.health + 5, this.character.maxHealth);
            console.log('Vampiric heal! +5 HP');
        }
    }
    
    checkLevelUp() {
        const currentLevel = this.xpSystem.level;
        const maxLevel = this.xpSystem.levelThresholds.length - 1;
        
        // Check if we can level up
        while (this.xpSystem.level < maxLevel && 
               this.xpSystem.currentXP >= this.xpSystem.levelThresholds[this.xpSystem.level]) {
            this.xpSystem.level++;
            console.log(`LEVEL UP! Now level ${this.xpSystem.level}`);
            
            // Apply base stat increases
            this.applyLevelUpStats();
            
            // Check if this level has ability/spell choices
            if (this.xpSystem.level === 2) {
                // Level 2: Spell selection (3 spells to choose from)
                this.pendingAbilityChoice = 2;
                this.isAbilityChoiceOpen = true;
                console.log(`Spell choice available at level ${this.xpSystem.level}!`);
            } else if (this.xpSystem.level === 3 || this.xpSystem.level === 5 || this.xpSystem.level === 8) {
                this.pendingAbilityChoice = this.xpSystem.level;
                this.isAbilityChoiceOpen = true;
                console.log(`Ability choice available at level ${this.xpSystem.level}!`);
            }
        }
    }
    
    applyLevelUpStats() {
        // Base stat increases per level
        const oldMaxHealth = this.character.maxHealth;
        const oldBaseDamage = this.character.baseDamage;
        const oldBaseStrongDamage = this.character.baseStrongDamage;
        
        this.character.maxHealth += 10; // +10 max HP per level
        this.character.health += 10; // Also heal for the amount gained
        
        // Increase damage per level
        this.character.baseDamage += 1; // +1 damage per level for basic attacks
        this.character.baseStrongDamage += 2; // +2 damage per level for strong attacks
        
        // Ensure health doesn't exceed new max
        if (this.character.health > this.character.maxHealth) {
            this.character.health = this.character.maxHealth;
        }
        
        console.log(`Stats increased! Max HP: ${oldMaxHealth} -> ${this.character.maxHealth}, Base Damage: ${oldBaseDamage} -> ${this.character.baseDamage}, Strong Damage: ${oldBaseStrongDamage} -> ${this.character.baseStrongDamage}`);
    }
    
    getXPProgress() {
        const currentLevel = this.xpSystem.level;
        const maxLevel = this.xpSystem.levelThresholds.length - 1;
        
        if (currentLevel >= maxLevel) {
            return 1; // Max level, full bar
        }
        
        const currentLevelXP = currentLevel > 1 ? this.xpSystem.levelThresholds[currentLevel - 1] : 0;
        const nextLevelXP = this.xpSystem.levelThresholds[currentLevel];
        const xpIntoLevel = this.xpSystem.currentXP - currentLevelXP;
        const xpNeeded = nextLevelXP - currentLevelXP;
        
        return xpIntoLevel / xpNeeded;
    }
    
    getXPToNextLevel() {
        const currentLevel = this.xpSystem.level;
        const maxLevel = this.xpSystem.levelThresholds.length - 1;
        
        if (currentLevel >= maxLevel) {
            return 0; // Max level
        }
        
        return this.xpSystem.levelThresholds[currentLevel] - this.xpSystem.currentXP;
    }
    
    selectAbility(choice) {
        if (!this.pendingAbilityChoice) return;
        
        const level = this.pendingAbilityChoice;
        
        if (level === 2) {
            // Level 2: Spell selection (2 choices: A, B)
            if (choice === 'A') {
                this.spells.fireSplitters = true;
                console.log('Spell unlocked: FIRE SPLITTERS - 50 damage, 10s cooldown!');
            } else if (choice === 'B') {
                // Shield spell
                this.spells.shield = true;
                console.log('Spell unlocked: SHIELD - Absorbs 5 attacks or lasts 20 seconds, 30s cooldown!');
            }
        } else if (level === 3) {
            if (choice === 'A') {
                this.abilities.multishot = true;
                console.log('Ability unlocked: MULTISHOT - Ranged attacks fire 3 arrows!');
            } else {
                this.abilities.oneManShow = true;
                // Apply 15% more health
                const healthBonus = Math.floor(this.character.maxHealth * 0.15);
                this.character.maxHealth += healthBonus;
                this.character.health += healthBonus;
                console.log(`Ability unlocked: ONE MAN SHOW - 15% damage reduction + ${healthBonus} bonus HP!`);
            }
        } else if (level === 5) {
            if (choice === 'A') {
                this.abilities.berserker = true;
                console.log('Ability unlocked: BERSERKER - 30% more damage when below 50% health!');
            } else {
                this.abilities.vampiric = true;
                console.log('Ability unlocked: VAMPIRIC STRIKES - Heal 5 HP per kill!');
            }
        } else if (level === 8) {
            if (choice === 'A') {
                this.abilities.titansWrath = true;
                console.log('Ability unlocked: TITAN\'S WRATH - Strong attacks deal double damage!');
            } else {
                this.abilities.swiftAssassin = true;
                console.log('Ability unlocked: SWIFT ASSASSIN - 40% reduced cooldowns!');
            }
        }
        
        this.pendingAbilityChoice = null;
        this.isAbilityChoiceOpen = false;
    }
    
    // Calculate actual damage with abilities
    calculateDamage(baseDamage, attackType) {
        let damage = baseDamage;
        
        // Berserker: +30% damage when below 50% health
        if (this.abilities.berserker && this.character.health < this.character.maxHealth * 0.5) {
            damage = Math.floor(damage * 1.3);
        }
        
        // Titan's Wrath: double strong attack damage
        if (this.abilities.titansWrath && attackType === 'strong') {
            damage *= 2;
        }
        
        return damage;
    }
    
    // Calculate cooldown with abilities
    calculateCooldown(baseCooldown) {
        if (this.abilities.swiftAssassin) {
            return baseCooldown * 0.6; // 40% reduction
        }
        return baseCooldown;
    }
    
    // Calculate damage taken with abilities and shield
    calculateDamageTaken(baseDamage) {
        // Check if shield is active (both hits and lifetime must be > 0)
        if (this.shieldEffect && this.shieldEffect.active && this.shieldEffect.hitsRemaining > 0 && this.shieldEffect.lifetime > 0) {
            this.shieldEffect.hitsRemaining--;
            console.log(`Shield blocked attack! Hits remaining: ${this.shieldEffect.hitsRemaining}, Time remaining: ${this.shieldEffect.lifetime.toFixed(1)}s`);
            return 0; // Shield absorbs all damage
        }
        
        // Apply damage reduction from abilities
        if (this.abilities.oneManShow) {
            return Math.floor(baseDamage * 0.85); // 15% damage reduction
        }
        return baseDamage;
    }
    
    // Draw XP bar
    drawXPBar() {
        const barWidth = 300; // Wider bar to fit text inside
        const barHeight = 20;
        const barX = 10;
        const barY = 45; // Below health bar (health bar is now 28px + 10px top = 38px, so 45px for spacing)
        
        const progress = this.getXPProgress();
        const maxLevel = this.xpSystem.levelThresholds.length - 1;
        const xpToNext = this.getXPToNextLevel();
        
        // Old-school style XP bar matching health bar design
        
        // Outer shadow/depth effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(barX + 3, barY + 3, barWidth, barHeight);
        
        // Main background frame (dark with bevel)
        const bgGradient = this.ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        bgGradient.addColorStop(0, '#1a0f2a');
        bgGradient.addColorStop(0.5, '#0f081a');
        bgGradient.addColorStop(1, '#080410');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Inner frame (lighter border)
        this.ctx.strokeStyle = '#3a2a4a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX + 2, barY + 2, barWidth - 4, barHeight - 4);
        
        // XP bar background (dark purple)
        const xpBgX = barX + 4;
        const xpBgY = barY + 4;
        const xpBgWidth = barWidth - 8;
        const xpBgHeight = barHeight - 8;
        
        this.ctx.fillStyle = '#1a0033';
        this.ctx.fillRect(xpBgX, xpBgY, xpBgWidth, xpBgHeight);
        
        // XP fill with gradient (purple/blue gradient effect)
        if (progress > 0) {
            const xpFillWidth = xpBgWidth * progress;
            const xpGradient = this.ctx.createLinearGradient(xpBgX, xpBgY, xpBgX + xpFillWidth, xpBgY);
            xpGradient.addColorStop(0, '#6b5ce7');
            xpGradient.addColorStop(0.5, '#8b7df7');
            xpGradient.addColorStop(1, '#a855f7');
            this.ctx.fillStyle = xpGradient;
            this.ctx.fillRect(xpBgX, xpBgY, xpFillWidth, xpBgHeight);
            
            // Pixelated scanline effect
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < xpBgHeight; i += 2) {
                this.ctx.fillRect(xpBgX, xpBgY + i, xpFillWidth, 1);
            }
        }
        
        // Outer border highlight (top and left)
        this.ctx.strokeStyle = '#5a4a6a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(barX, barY);
        this.ctx.lineTo(barX + barWidth, barY);
        this.ctx.lineTo(barX + barWidth, barY + barHeight);
        this.ctx.stroke();
        
        // Inner border shadow (bottom and right)
        this.ctx.strokeStyle = '#0f081a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(barX + 1, barY + barHeight - 1);
        this.ctx.lineTo(barX + barWidth - 1, barY + barHeight - 1);
        this.ctx.lineTo(barX + barWidth - 1, barY + 1);
        this.ctx.stroke();
        
        // Text inside the bar (centered)
        this.ctx.font = 'bold 12px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let xpText;
        if (this.xpSystem.level >= maxLevel) {
            xpText = `LVL ${this.xpSystem.level} | MAX LEVEL`;
        } else {
            xpText = `LVL ${this.xpSystem.level} | ${xpToNext} XP to LVL ${this.xpSystem.level + 1}`;
        }
        
        // Text shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillText(xpText, barX + barWidth / 2 + 1, barY + barHeight / 2 + 1);
        
        // Main text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(xpText, barX + barWidth / 2, barY + barHeight / 2);
        
        this.ctx.textAlign = 'left';
    }
    
    // Helper functions for quest objectives
    addQuestObjective(text) {
        // Check if objective already exists
        const existing = this.questObjectives.find(obj => obj.text === text);
        if (existing) {
            existing.active = true;
            return;
        }
        
        // Add new objective (max 3 active)
        if (this.questObjectives.length < 3) {
            this.questObjectives.push({ active: true, text: text });
        } else {
            // Replace first inactive objective if all are active
            const inactive = this.questObjectives.find(obj => !obj.active);
            if (inactive) {
                inactive.active = true;
                inactive.text = text;
            } else {
                // All slots full, replace the first one
                this.questObjectives[0].text = text;
                this.questObjectives[0].active = true;
            }
        }
    }
    
    removeQuestObjective(text) {
        const objective = this.questObjectives.find(obj => obj.text === text);
        if (objective) {
            objective.active = false;
        }
    }
    
    clearAllObjectives() {
        this.questObjectives.forEach(obj => obj.active = false);
    }
    
    // Heavy Attack Effect
    createHeavyAttackEffect() {
        if (!this.heavyAttackEffectSpriteLoaded) {
            console.log('Heavy attack effect sprite not loaded!');
            return;
        }
        
        // Calculate sword position based on character position and facing direction
        const charCenterX = this.character.x + this.character.width / 2;
        const charCenterY = this.character.y + this.character.height / 2;
        
        // Position effect at sword location (offset based on facing direction)
        // Sword is typically at the front of the character
        const swordOffsetX = this.character.facingRight ? 30 : -30; // Offset to sword position
        const swordOffsetY = -10; // Slightly above center
        
        const effect = {
            x: charCenterX + swordOffsetX - 96, // Center the 192px wide frame
            y: charCenterY + swordOffsetY - 64, // Center the 128px tall frame
            width: 192,
            height: 128,
            currentFrame: 0,
            frameTime: 0,
            frameDuration: 0.069, // 5 frames * 0.069s = 0.345s (15% slower for visibility)
            totalFrames: 5,
            lifetime: 0.6, // Longer than animation to ensure it completes
            facingRight: this.character.facingRight
        };
        
        this.heavyAttackEffects.push(effect);
        console.log('✓ Heavy attack effect created! Total effects:', this.heavyAttackEffects.length);
    }
    
    updateHeavyAttackEffects(deltaTime) {
        if (!this.heavyAttackEffects || this.heavyAttackEffects.length === 0) return;
        
        for (let i = this.heavyAttackEffects.length - 1; i >= 0; i--) {
            const effect = this.heavyAttackEffects[i];
            
            // Update position to follow character's sword
            const charCenterX = this.character.x + this.character.width / 2;
            const charCenterY = this.character.y + this.character.height / 2;
            const swordOffsetX = effect.facingRight ? 30 : -30;
            const swordOffsetY = -10;
            
            effect.x = charCenterX + swordOffsetX - 96;
            effect.y = charCenterY + swordOffsetY - 64;
            
            // Update animation (play through all 5 frames)
            effect.frameTime += deltaTime;
            if (effect.frameTime >= effect.frameDuration) {
                effect.frameTime -= effect.frameDuration;
                effect.currentFrame++;
                console.log('Heavy attack effect frame advanced:', effect.currentFrame, '/', effect.totalFrames);
                
                // Remove when animation completes (all 5 frames played)
                if (effect.currentFrame >= effect.totalFrames) {
                    console.log('Heavy attack effect animation complete, removing');
                    this.heavyAttackEffects.splice(i, 1);
                    continue;
                }
            }
            
            // Update lifetime (backup removal)
            effect.lifetime -= deltaTime;
            if (effect.lifetime <= 0) {
                console.log('Heavy attack effect lifetime expired, removing');
                this.heavyAttackEffects.splice(i, 1);
            }
        }
    }
    
    // Fire Splitters magic attack
    createFireSplitters() {
        if (!this.fireSplittersSpriteLoaded || !this.spells.fireSplitters) return;
        
        // Create 1 fire projectile
        const shootDir = this.character.shootDirection;
        const dirX = shootDir.x;
        const dirY = shootDir.y;
        
        const projectile = {
            x: this.character.x + this.character.width / 2 - 64, // Center on character, 128x64 frame
            y: this.character.y + this.character.height / 2 - 32,
            width: 128, // Original radius
            height: 64,
            vx: dirX * 300, // Speed
            vy: dirY * 300,
            currentFrame: 0,
            frameTime: 0,
            frameDuration: 0.1, // 10 fps (plays once, like a bomb)
            totalFrames: 6, // 6 frames total - plays once then explodes
            lifetime: 0.6, // 6 frames * 0.1s = 0.6 seconds (one animation cycle)
            damage: 35, // Damage per cast
            facingRight: dirX >= 0, // Store direction for flipping
            animationComplete: false // Track if animation finished
        };
        
        this.magicProjectiles.push(projectile);
        
        console.log('Fire Splitters cast! 1 projectile created');
    }
    
    // Shield magic effect
    createShield() {
        if (!this.shieldSpriteLoaded || !this.spells.shield) return;
        
        // Don't create if shield already active
        if (this.shieldEffect && this.shieldEffect.active) {
            console.log('Shield already active!');
            return;
        }
        
        this.shieldEffect = {
            active: true,
            hitsRemaining: 5, // Absorbs 5 attacks
            lifetime: 20.0, // Lasts 20 seconds
            currentFrame: 0,
            frameTime: 0,
            frameDuration: 0.1, // 10 fps for smooth animation
            totalFrames: 15, // 3 rows x 5 frames per row
            width: 128,
            height: 128,
            opacity: 0.6 // Slightly transparent
        };
        
        console.log('Shield activated! Can absorb 5 attacks or will last 20 seconds, whichever comes first');
    }
    
    updateShieldEffect(deltaTime) {
        if (!this.shieldEffect || !this.shieldEffect.active) return;
        
        // Update animation
        this.shieldEffect.frameTime += deltaTime;
        if (this.shieldEffect.frameTime >= this.shieldEffect.frameDuration) {
            this.shieldEffect.frameTime = 0;
            this.shieldEffect.currentFrame = (this.shieldEffect.currentFrame + 1) % this.shieldEffect.totalFrames;
        }
        
        // Update lifetime (20 seconds)
        this.shieldEffect.lifetime -= deltaTime;
        
        // Remove shield if either hits are depleted OR lifetime expires (whichever comes first)
        if (this.shieldEffect.hitsRemaining <= 0) {
            this.shieldEffect.active = false;
            this.shieldEffect = null;
            console.log('Shield depleted after 5 hits!');
        } else if (this.shieldEffect.lifetime <= 0) {
            this.shieldEffect.active = false;
            this.shieldEffect = null;
            console.log('Shield expired after 20 seconds!');
        }
    }
    
    updateMagicProjectiles(deltaTime) {
        for (let i = this.magicProjectiles.length - 1; i >= 0; i--) {
            const proj = this.magicProjectiles[i];
            
            // Update position
            proj.x += proj.vx * deltaTime;
            proj.y += proj.vy * deltaTime;
            
            // Update animation (play once, like a bomb - explodes after one cycle)
            proj.frameTime += deltaTime;
            if (proj.frameTime >= proj.frameDuration) {
                proj.frameTime = 0;
                proj.currentFrame++;
                // When animation completes (all 6 frames played), remove projectile (explodes)
                if (proj.currentFrame >= proj.totalFrames) {
                    this.magicProjectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Update lifetime (backup removal if something goes wrong)
            proj.lifetime -= deltaTime;
            if (proj.lifetime <= 0) {
                this.magicProjectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with enemies
            const projRect = {
                x: proj.x,
                y: proj.y,
                width: proj.width,
                height: proj.height
            };
            
            for (const enemy of this.enemies) {
                if (!enemy || enemy.health <= 0) continue;
                
                const enemyRect = {
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.width,
                    height: enemy.height
                };
                
                // Check if enemy is inside projectile area - continuous damage while overlapping
                if (this.checkCollision(projRect, enemyRect)) {
                    // Check if we've already damaged this enemy this frame (prevent multiple hits per frame)
                    // Use frame-based timing for continuous damage
                    if (!enemy.lastFireSplittersDamageFrame) {
                        enemy.lastFireSplittersDamageFrame = proj.currentFrame;
                    }
                    
                    // Deal damage every frame while enemy is inside (continuous damage)
                    if (enemy.lastFireSplittersDamageFrame !== proj.currentFrame) {
                        // Deal damage
                        const damage = this.calculateDamage(proj.damage, 'magic');
                        enemy.health -= damage;
                        enemy.lastFireSplittersDamageFrame = proj.currentFrame;
                        console.log(`Enemy taking continuous damage from Fire Splitters! Damage: ${damage}, Health: ${enemy.health}`);
                        
                        // Create damage popup with orange color (not blocked)
                        this.createDamagePopup(enemy.x + enemy.width / 2, enemy.y, damage, false, '#ff6600');
                        
                        // Check for Blue Golem hurt animation triggers
                        if (enemy.type === 'blueGolem' && enemy.hurtThresholds && enemy.hurtThresholdsUsed) {
                            const healthPercent = enemy.health / enemy.maxHealth;
                            for (let j = 0; j < enemy.hurtThresholds.length; j++) {
                                const threshold = enemy.hurtThresholds[j];
                                if (healthPercent <= threshold && !enemy.hurtThresholdsUsed.includes(threshold)) {
                                    enemy.hurtThresholdsUsed.push(threshold);
                                    enemy.isHurt = true;
                                    enemy.hurtTimer = enemy.hurtFrames * enemy.hurtFrameDuration;
                                    console.log(`Blue Golem hurt animation triggered at ${(threshold * 100).toFixed(0)}% health!`);
                                }
                            }
                        }
                        
                        // Check if enemy is dead
                        if (enemy.health <= 0) {
                            enemy.health = 0;
                            enemy.isDead = true;
                            
                            // Set death animation state properly
                            if (enemy.type === 'blueGolem') {
                                enemy.state = 'dying';
                                enemy.deathAnimationTimer = enemy.dieFrames * enemy.dieFrameDuration;
                                enemy.currentFrame = 0;
                                enemy.frameTime = 0;
                            } else {
                                enemy.state = 'dying';
                                enemy.deathAnimationTimer = 1.12; // 4 frames * 0.28s = 1.12s
                                enemy.currentFrame = 4; // Start at frame 4 (last 4 frames: 4, 5, 6, 7)
                                enemy.frameTime = 0;
                                enemy.deathFrameCount = 0;
                            }
                            
                            this.gainXP(enemy.type);
                            console.log('Enemy killed by Fire Splitters! Death animation started.');
                        }
                    }
                } else {
                    // Enemy left the area, reset damage tracking
                    if (enemy.lastFireSplittersDamageFrame !== undefined) {
                        enemy.lastFireSplittersDamageFrame = undefined;
                    }
                }
            }
            
            // Remove if out of bounds
            const margin = 200;
            if (proj.x < this.camera.x - margin || proj.x > this.camera.x + this.canvas.width + margin ||
                proj.y < this.camera.y - margin || proj.y > this.camera.y + this.canvas.height + margin) {
                this.magicProjectiles.splice(i, 1);
            }
        }
    }
}
