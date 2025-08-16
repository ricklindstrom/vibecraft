// Block type constants
const BLOCK_TYPES = {
    GRASS: 0,
    DIRT: 1,
    STONE: 2,
    SAND: 3,
    WOOD: 4,
    LEAVES: 5,
    GLASS: 6,
    AIR: 7, // Empty space, not rendered
    WHITE: 8,
    BLACK: 9,
    // New glowing blocks for interior lighting
    GLOWSTONE: 10,      // Bright white glow
    LANTERN: 11,        // Warm orange glow
    TORCH: 12,          // Flickering yellow glow
    CRYSTAL: 13,        // Blue-white glow
    FIREPLACE: 14       // Red-orange glow
};

// Structure generation result format
/**
 * @typedef {Object} BlockPosition
 * @property {number} x - World X coordinate
 * @property {number} y - World Y coordinate
 * @property {number} z - World Z coordinate
 * @property {number} type - Block type from BLOCK_TYPES
 */

/**
 * @typedef {Object} Structure
 * @property {BlockPosition[]} blocks - Array of blocks making up the structure
 */

class World {
    constructor(scene, chunkSize = 16, renderDistance = 3) {
        this.scene = scene;
        this.CHUNK_SIZE = chunkSize;
        this.RENDER_DISTANCE = renderDistance;
        this.CLEAN_DISTANCE = renderDistance + 1;
        this.chunks = new Map();
        this.chunkLODs = new Map(); // Track LOD level for each chunk

        // LOD settings - simplified to just distance checks
        this.LOD_LEVELS = {
            FULL: { blockSize: 1, maxDistance: 2, treeChance: 1.0, waterDetail: 1, stoneChance: 1.0 },
            HIGH: { blockSize: 1, maxDistance: 3, treeChance: 1.0, waterDetail: 1, stoneChance: 1.0 },
            MEDIUM: { blockSize: 1, maxDistance: 5, treeChance: 1.0, waterDetail: 2, stoneChance: 1.0 },
            LOW: { blockSize: 2, maxDistance: 8, treeChance: 0.3, waterDetail: 4, stoneChance: 0.0 },
            MINIMAL: { blockSize: 4, maxDistance: 12, treeChance: 0.0, waterDetail: 8, stoneChance: 0.0 }
        };

        this.stats = {
            loadedChunks: 0,
            totalBlocksRendered: 0,
            waterPlanesRendered: 0,
            treesGenerated: 0,
            lastChunkGenTime: 0,
            averageChunkGenTime: 0,
            chunkGenTimeHistory: [],
            memoryUsed: 0,
            currentPlayerChunk: { x: 0, y: 0 },
            highestPoint: -Infinity,
            lowestPoint: Infinity
        };

        // Create shared geometry and materials
        this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.blockGeometry2x = new THREE.BoxGeometry(2, 2, 2); // 2x2x2 blocks
        this.blockGeometry4x = new THREE.BoxGeometry(4, 4, 4); // 4x4x4 blocks
        this.materials = this.createMaterials();
        this.waterGeometry = new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE);
        this.waterMaterial = new THREE.MeshPhongMaterial({
            color: 0x004d99,
            transparent: true,
            opacity: 0.5,
            shininess: 0,
            specular: 0x222244,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
        });
        // Shiny water surface material
        this.waterSurfaceMaterial = new THREE.MeshPhongMaterial({
            color: 0x3399ff,
            transparent: true,
            opacity: 0.75,
            shininess: 100,
            specular: 0xffffff,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
        });

        // Matrix and temp objects for instancing
        this.matrix = new THREE.Matrix4();
        this.position = new THREE.Vector3();
        this.quaternion = new THREE.Quaternion();
        this.scale = new THREE.Vector3(1, 1, 1);
    }

    createMaterials() {
        return {
            [BLOCK_TYPES.GRASS]: [
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // right - dirt
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // left - dirt
                new THREE.MeshLambertMaterial({ color: 0x4CAF50 }), // top - grass
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // bottom - dirt
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // front - dirt
                new THREE.MeshLambertMaterial({ color: 0x8B4513 })  // back - dirt
            ],
            [BLOCK_TYPES.DIRT]: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
            [BLOCK_TYPES.STONE]: [
                new THREE.MeshLambertMaterial({ color: 0x808080 }),
                new THREE.MeshLambertMaterial({ color: 0x808080 }),
                new THREE.MeshLambertMaterial({ color: 0x909090 }),
                new THREE.MeshLambertMaterial({ color: 0x707070 }),
                new THREE.MeshLambertMaterial({ color: 0x808080 }),
                new THREE.MeshLambertMaterial({ color: 0x808080 })
            ],
            [BLOCK_TYPES.SAND]: [
                new THREE.MeshLambertMaterial({ color: 0xF4A460 }),
                new THREE.MeshLambertMaterial({ color: 0xF4A460 }),
                new THREE.MeshLambertMaterial({ color: 0xFFD700 }),
                new THREE.MeshLambertMaterial({ color: 0xDAA520 }),
                new THREE.MeshLambertMaterial({ color: 0xF4A460 }),
                new THREE.MeshLambertMaterial({ color: 0xF4A460 })
            ],
            [BLOCK_TYPES.WOOD]: [
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
                new THREE.MeshLambertMaterial({ color: 0x966F33 }),
                new THREE.MeshLambertMaterial({ color: 0x966F33 }),
                new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
                new THREE.MeshLambertMaterial({ color: 0x8B4513 })
            ],
            [BLOCK_TYPES.GLASS]: new THREE.MeshLambertMaterial({
                color: 0x88ccee,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide,
                blending: THREE.NormalBlending,
                depthWrite: false
            }),
            [BLOCK_TYPES.LEAVES]: new THREE.MeshLambertMaterial({
                color: 0x228B22,
                transparent: true,
                opacity: 0.9
            }),
            [BLOCK_TYPES.WHITE]: new THREE.MeshLambertMaterial({ color: 0xffffff }),
            [BLOCK_TYPES.BLACK]: new THREE.MeshLambertMaterial({ color: 0x000000 }),
            // New glowing blocks for interior lighting
            [BLOCK_TYPES.GLOWSTONE]: new THREE.MeshLambertMaterial({ 
                color: 0xffffcc,
                emissive: 0xffffcc,
                emissiveIntensity: 0.8
            }),
            [BLOCK_TYPES.LANTERN]: new THREE.MeshLambertMaterial({ 
                color: 0xffaa44,
                emissive: 0xffaa44,
                emissiveIntensity: 0.6
            }),
            [BLOCK_TYPES.TORCH]: new THREE.MeshLambertMaterial({ 
                color: 0xffdd88,
                emissive: 0xffdd88,
                emissiveIntensity: 0.7
            }),
            [BLOCK_TYPES.CRYSTAL]: new THREE.MeshLambertMaterial({ 
                color: 0x88ccff,
                emissive: 0x88ccff,
                emissiveIntensity: 0.5
            }),
            [BLOCK_TYPES.FIREPLACE]: new THREE.MeshLambertMaterial({ 
                color: 0xff6644,
                emissive: 0xff6644,
                emissiveIntensity: 0.9
            })
        };
    }

    generateTreePositionsForChunk(chunkX, chunkY, lodLevel) {
        const chunkTrees = [];
        const treesPerChunk = Math.floor(300 / (this.RENDER_DISTANCE * this.RENDER_DISTANCE * 4));

        //If there is a terrain override for chunk, then can't place trees there.
        //const centerX = chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
        //const centerY = chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
        // const overrideHeight = Structures.getTerrainOverride(centerX, centerY);
        // if(overrideHeight) {
        //      // If there is a terrain override, then we can't place trees there.
        //     return chunkTrees; 
        // }

        // Use the class random method for consistency

        for (let i = 0; i < treesPerChunk; i++) {
            const localX = Math.floor(this.random(chunkX * i, chunkY) * this.CHUNK_SIZE);
            const localY = Math.floor(this.random(chunkX, chunkY * i) * this.CHUNK_SIZE);

            const worldX = chunkX * this.CHUNK_SIZE + localX;
            const worldY = chunkY * this.CHUNK_SIZE + localY;
            const height = TerrainGenerator.getTerrainHeight(worldX, worldY);

            // Apply LOD-based tree chance
            if (height > 0 && this.random(worldX, worldY) < lodLevel.treeChance) {
                if(!Structures.getTerrainOverride(worldX, worldY)) {
                    chunkTrees.push({ x: worldX, y: worldY, groundHeight: height });
                }
            }
        }

        return chunkTrees;
    }

    generateTreesInChunk(chunkGroup, chunkX, chunkY, chunkTrees) {
        chunkTrees.map(tree => {
            const treeBlocks = Structures.createTree(tree.x, tree.y, tree.groundHeight);
            this.generateBlocks(treeBlocks, chunkGroup);
        });
    }

    getLODLevel(distance) {
        if (distance <= this.LOD_LEVELS.FULL.maxDistance) return this.LOD_LEVELS.FULL;
        if (distance <= this.LOD_LEVELS.HIGH.maxDistance) return this.LOD_LEVELS.HIGH;
        if (distance <= this.LOD_LEVELS.MEDIUM.maxDistance) return this.LOD_LEVELS.MEDIUM;
        if (distance <= this.LOD_LEVELS.LOW.maxDistance) return this.LOD_LEVELS.LOW;
        if (distance <= this.LOD_LEVELS.MINIMAL.maxDistance) return this.LOD_LEVELS.MINIMAL;
        return this.LOD_LEVELS.MINIMAL;
    }

    getChunkDistance(chunkX, chunkY, playerX, playerY) {
        // Convert player position to world coordinates if they're chunk coordinates
        const playerWorldX = typeof playerX === 'number' ? playerX : playerX * this.CHUNK_SIZE;
        const playerWorldY = typeof playerY === 'number' ? playerY : playerY * this.CHUNK_SIZE;

        // Calculate chunk bounds
        const chunkWorldX = chunkX * this.CHUNK_SIZE;
        const chunkWorldY = chunkY * this.CHUNK_SIZE;

        // Find closest point in chunk to player
        const closestX = Math.max(chunkWorldX, Math.min(chunkWorldX + this.CHUNK_SIZE, playerWorldX));
        const closestY = Math.max(chunkWorldY, Math.min(chunkWorldY + this.CHUNK_SIZE, playerWorldY));

        // Calculate actual distance to closest point
        return Math.sqrt(
            Math.pow(closestX - playerWorldX, 2) +
            Math.pow(closestY - playerWorldY, 2)
        ) / this.CHUNK_SIZE; // Convert to chunk units
    }


    // Better mathmatical modulo that works for negative numbers
    mod(x, n) {
        return ((x % n) + n) % n;
    }

    // Deterministic random function for consistent results
    random(x, y) {
        const a = ((x * 1231) + (y * 5897)) % 123456789;
        // Mix the bits using XOR and shifts
        let b = a;
        b = (b ^ (b << 13)) & 0x7fffffff;
        b = (b ^ (b >> 17)) & 0x7fffffff;
        b = (b ^ (b << 5)) & 0x7fffffff;
        // Normalize to 0-1 range
        return b / 0x7fffffff;
    }

    /**
     * Calculates the height range and water planes for a chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkY - Chunk Y coordinate
     * @param {number} samplingStep - Step size for sampling terrain
     * @returns {{minHeight: number, maxHeight: number, waterPlanes: Array}} Height range and water planes
     */
    calculateChunkHeights(chunkX, chunkY, samplingStep) {
        let minHeight = Infinity;
        let maxHeight = -Infinity;
        const waterPlanes = [];

        // Sample terrain heights
        for (let x = 0; x < this.CHUNK_SIZE; x += samplingStep) {
            for (let y = 0; y < this.CHUNK_SIZE; y += samplingStep) {
                const worldX = chunkX * this.CHUNK_SIZE + x;
                const worldY = chunkY * this.CHUNK_SIZE + y;
                const height = TerrainGenerator.getTerrainHeight(worldX, worldY);
                minHeight = Math.min(minHeight, height);
                maxHeight = Math.max(maxHeight, height);

                // Update global height stats
                this.stats.highestPoint = Math.max(this.stats.highestPoint, height);
                this.stats.lowestPoint = Math.min(this.stats.lowestPoint, height);
            }
        }

        return { minHeight, maxHeight, waterPlanes };
    }

    /**
     * Creates water planes for a chunk
     * @param {number} minHeight - Minimum height in chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkY - Chunk Y coordinate
     * @param {number} waterDetail - Water detail level
     * @returns {Array} Array of water planes
     */
    createWaterPlanes(minHeight, chunkX, chunkY, waterDetail) {
        const waterPlanes = [];
        if (minHeight < 0) {
            for (let depth = 0; depth >= minHeight; depth -= waterDetail) {
                const isSurface = (depth === 0);
                const waterPlane = new THREE.Mesh(
                    this.waterGeometry,
                    isSurface ? this.waterSurfaceMaterial : this.waterMaterial
                );
                const waterPos = CoordinateConverter.worldToThree.position({
                    x: chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
                    y: chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
                    z: depth + (isSurface ? 0 : 0.49)
                });
                waterPlane.position.set(waterPos.x, waterPos.y, waterPos.z);
                waterPlane.rotation.x = -Math.PI / 2;
                waterPlanes.push(waterPlane);
            }
        }
        return waterPlanes;
    }

    /**
     * Generates terrain blocks for a chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkY - Chunk Y coordinate
     * @param {number} blockSize - Size of blocks to generate
     * @param {number} samplingStep - Step size for sampling terrain
     * @returns {{blockCount: number, blockPositions: Map, instanceCounts: Map}} Block generation results
     */
    generateTerrainBlocks(chunkX, chunkY, blockSize, samplingStep) {
        const blockCounts = new Map();
        const blockPositions = new Map();
        let blockCount = 0;

        for (let x = 0; x < this.CHUNK_SIZE; x += samplingStep) {
            for (let y = 0; y < this.CHUNK_SIZE; y += samplingStep) {
                const worldX = chunkX * this.CHUNK_SIZE + x;
                const worldY = chunkY * this.CHUNK_SIZE + y;
                const height = TerrainGenerator.getTerrainHeight(worldX, worldY);
                const isCliff = TerrainGenerator.isCliff(worldX, worldY);

                const startZ = Math.floor(height);
                const bottomZ = Math.min(-5, startZ);
                const zStep = blockSize;

                for (let z = bottomZ; z <= startZ; z += zStep) {
                    let blockType = this.determineBlockType(height, z, startZ, blockSize, isCliff);
                    if (blockType === undefined) continue;

                    blockCount++;
                    if (!blockCounts.has(blockType)) {
                        blockCounts.set(blockType, 0);
                        blockPositions.set(blockType, []);
                    }

                    const blockCenterOffset = (blockSize - 1) / 2;
                    const worldPos = { 
                        x: worldX + blockCenterOffset, 
                        y: worldY + blockCenterOffset, 
                        z: z + blockCenterOffset 
                    };
                    const threePos = CoordinateConverter.worldToThree.position(worldPos);
                    blockPositions.get(blockType).push({...threePos, blockSize});
                    blockCounts.set(blockType, blockCounts.get(blockType) + 1);
                }
            }
        }

        return { blockCount, blockPositions, instanceCounts: blockCounts };
    }

    /**
     * Determines the block type based on height and position
     * @param {number} height - Terrain height
     * @param {number} z - Current Z position
     * @param {number} startZ - Starting Z position
     * @param {number} blockSize - Size of blocks
     * @param {boolean} isCliff - Whether the terrain is a cliff
     * @returns {number|undefined} Block type or undefined if no block should be placed
     */
    determineBlockType(height, z, startZ, blockSize, isCliff) {
        if (height >= 0) {
            if (z === startZ || (z > startZ - blockSize && z <= startZ)) {
                return BLOCK_TYPES.GRASS;
            } else if (isCliff && z > startZ - 2 * blockSize) {
                return BLOCK_TYPES.DIRT;
            } else if (isCliff) {
                return BLOCK_TYPES.STONE;
            }
        } else {
            if (z === startZ || (z > startZ - blockSize && z <= startZ)) {
                return BLOCK_TYPES.SAND;
            } else if (isCliff) {
                return BLOCK_TYPES.STONE;
            }
        }
        return undefined;
    }

    /**
     * Creates instanced meshes for blocks
     * @param {Map} blocksBySize - Map of block sizes to block types and positions
     * @param {THREE.Group} chunkGroup - Group to add meshes to
     * @param {Object} lodLevel - LOD level settings
     */
    createInstancedMeshes(blocksBySize, chunkGroup, lodLevel) {
        for (const [size, blockTypeMap] of blocksBySize) {
            const geometry = this.getGeometryForSize(size);

            for (const [blockType, positions] of blockTypeMap) {
                if (positions.length > 0) {
                    const material = Array.isArray(this.materials[blockType])
                        ? this.materials[blockType]
                        : Array(6).fill(this.materials[blockType]);

                    const instancedMesh = new THREE.InstancedMesh(
                        geometry,
                        material,
                        positions.length
                    );

                    // Adjust shadow settings based on LOD
                    if (lodLevel.maxDistance <= this.LOD_LEVELS.MEDIUM.maxDistance) {
                        instancedMesh.castShadow = true;
                        instancedMesh.receiveShadow = true;
                    } else {
                        instancedMesh.castShadow = false;
                        instancedMesh.receiveShadow = false;
                    }

                    let instanceIndex = 0;
                    for (const posData of positions) {
                        this.position.set(posData.x, posData.y, posData.z);
                        this.matrix.compose(this.position, this.quaternion, this.scale);
                        instancedMesh.setMatrixAt(instanceIndex, this.matrix);
                        instanceIndex++;
                    }

                    instancedMesh.instanceMatrix.needsUpdate = true;
                    chunkGroup.add(instancedMesh);
                }
            }
        }
    }

    /**
     * Gets the appropriate geometry for a given block size
     * @param {number} size - Block size
     * @returns {THREE.BoxGeometry} Geometry for the block size
     */
    getGeometryForSize(size) {
        if (size === 1) return this.blockGeometry;
        if (size === 2) return this.blockGeometry2x;
        return this.blockGeometry4x;
    }

    /**
     * Updates chunk statistics
     * @param {number} blockCount - Number of blocks generated
     * @param {number} waterCount - Number of water planes
     * @param {number} treeCount - Number of trees
     * @param {number} genTime - Generation time in milliseconds
     */
    updateChunkStats(blockCount, waterCount, treeCount, genTime) {
        this.stats.loadedChunks = this.chunks.size;
        this.stats.totalBlocksRendered += blockCount;
        this.stats.waterPlanesRendered += waterCount;
        this.stats.treesGenerated += treeCount;
        this.stats.lastChunkGenTime = genTime;

        // Calculate moving average of chunk generation time
        this.stats.chunkGenTimeHistory.push(genTime);
        if (this.stats.chunkGenTimeHistory.length > 50) {
            this.stats.chunkGenTimeHistory.shift();
        }
        this.stats.averageChunkGenTime = this.stats.chunkGenTimeHistory.reduce((a, b) => a + b, 0)
            / this.stats.chunkGenTimeHistory.length;

        // Estimate memory usage (very rough approximation)
        const geometrySize = blockCount * 0.5; // KB per block
        const textureSize = blockCount * 0.1; // KB per block
        this.stats.memoryUsed = (geometrySize + textureSize) / 1024; // Convert to MB
    }

    /**
     * Generates a chunk at the specified coordinates
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkY - Chunk Y coordinate
     * @param {number} playerX - Player X coordinate
     * @param {number} playerY - Player Y coordinate
     * @param {boolean} renderAsSurfaceMesh - Whether to render as a surface mesh
     */
    generateChunk(chunkX, chunkY, playerX, playerY, renderAsSurfaceMesh = false) {
        const startTime = performance.now();
        const chunkKey = `${chunkX},${chunkY}`;

        // Always define these so they're available for stats
        let blockCount = 0;
        let waterPlanes = [];
        let chunkTrees = [];

        // Calculate LOD level based on actual distance to player
        const distance = this.getChunkDistance(chunkX, chunkY, playerX, playerY);
        const lodLevel = this.getLODLevel(distance);
        
        // Check if chunk exists and needs LOD update
        if (this.chunks.has(chunkKey)) {
            const currentLOD = this.chunkLODs.get(chunkKey);
            if (currentLOD === lodLevel) {
                return; // Same LOD level, no update needed
            }
            // Different LOD level, remove old chunk
            this.scene.remove(this.chunks.get(chunkKey));
            this.chunks.delete(chunkKey);
            this.chunkLODs.delete(chunkKey);
        }

        let chunkGroup;
        if (renderAsSurfaceMesh) {
            chunkGroup = this.generateSurfaceMeshChunk(chunkX, chunkY, playerX, playerY);
            blockCount = 0;
            waterPlanes = [];
            chunkTrees = [];
        } else {
            chunkGroup = new THREE.Group();

            // Calculate heights and create water planes
            const { minHeight, maxHeight } = this.calculateChunkHeights(chunkX, chunkY, lodLevel.blockSize);
            waterPlanes = this.createWaterPlanes(minHeight, chunkX, chunkY, lodLevel.waterDetail);
            waterPlanes.forEach(plane => chunkGroup.add(plane));

            // Generate terrain blocks
            const result = this.generateTerrainBlocks(chunkX, chunkY, lodLevel.blockSize, lodLevel.blockSize);
            blockCount = result.blockCount;
            const blockPositions = result.blockPositions;
            const instanceCounts = result.instanceCounts;

            // Group blocks by size for instanced meshes
            const blocksBySize = new Map();
            for (const [blockType, positions] of blockPositions) {
                for (const posData of positions) {
                    const size = posData.blockSize || 1;
                    if (!blocksBySize.has(size)) {
                        blocksBySize.set(size, new Map());
                    }
                    if (!blocksBySize.get(size).has(blockType)) {
                        blocksBySize.get(size).set(blockType, []);
                    }
                    blocksBySize.get(size).get(blockType).push(posData);
                }
            }

            // Create instanced meshes for blocks
            this.createInstancedMeshes(blocksBySize, chunkGroup, lodLevel);
        }

        // Generate houses and trees
        const centerX = chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
        const centerY = chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
        if(FiveByFive.isBuildable(chunkX, chunkY, centerX, centerY)) {
            if(this.random(centerX, centerY) > 0.66) {
                let houseBlocks = FiveByFive.createHouse(centerX, centerY);
                this.generateBlocks(houseBlocks, chunkGroup);
            } else if(this.random(centerX, centerY) > 0.33) {
                let houseBlocks = FiveByFive.createBuilding(centerX, centerY, 8, 8, 8);
                this.generateBlocks(houseBlocks, chunkGroup);
            } else {
                let houseBlocks = Houses.createHouse(centerX, centerY);
                this.generateBlocks(houseBlocks, chunkGroup);
            }
        }

        chunkTrees = this.generateTreePositionsForChunk(chunkX, chunkY, lodLevel);
        this.generateTreesInChunk(chunkGroup, chunkX, chunkY, chunkTrees);

        // Add chunk to scene and update tracking
        this.chunks.set(chunkKey, chunkGroup);
        this.chunkLODs.set(chunkKey, lodLevel);
        this.scene.add(chunkGroup);

        // Update statistics
        const endTime = performance.now();
        const genTime = endTime - startTime;
        if (renderAsSurfaceMesh) {
            // For surface mesh, skip block stats for now
            this.updateChunkStats(0, 0, 0, genTime);
        } else {
            this.updateChunkStats(blockCount, waterPlanes.length, chunkTrees.length, genTime);
        }
    }

    update(playerX, playerY, renderAsSurfaceMesh = false) {
        const playerChunkX = Math.floor(playerX / this.CHUNK_SIZE);
        const playerChunkY = Math.floor(playerY / this.CHUNK_SIZE);

        this.stats.currentPlayerChunk = { x: playerChunkX, y: playerChunkY };

        // Check all existing chunks for LOD updates and generate new chunks
        for (let x = playerChunkX - this.RENDER_DISTANCE; x <= playerChunkX + this.RENDER_DISTANCE; x++) {
            for (let y = playerChunkY - this.RENDER_DISTANCE; y <= playerChunkY + this.RENDER_DISTANCE; y++) {
                const distance = this.getChunkDistance(x, y, playerX, playerY);
                const newLodLevel = this.getLODLevel(distance);
                const chunkKey = `${x},${y}`;

                // If chunk exists but LOD would be different, or chunk doesn't exist
                if (!this.chunks.has(chunkKey) || this.chunkLODs.get(chunkKey) !== newLodLevel) {
                    this.generateChunk(x, y, playerX, playerY, renderAsSurfaceMesh);
                }
            }
        }

        // Remove chunks that are too far away
        for (const [key, chunk] of this.chunks) {
            const [chunkX, chunkY] = key.split(',').map(Number);
            if (Math.abs(chunkX - playerChunkX) > this.CLEAN_DISTANCE ||
                Math.abs(chunkY - playerChunkY) > this.CLEAN_DISTANCE) {
                this.scene.remove(chunk);
                this.chunks.delete(key);
                this.chunkLODs.delete(key); // Clean up LOD tracking
                this.stats.loadedChunks = this.chunks.size;
            }
        }
    }

    getStats() {
        return this.stats;
    }

    /**
     * Generates a blocks in the world from a collection of block positions
     * @param {blocks} blocks - The blocks to generate
     * @param {THREE.Group} targetGroup - The group to add the structure to
     * @returns {Map<number, THREE.InstancedMesh>} Map of block types to their instance meshes
     */
    generateBlocks(blocks, targetGroup) {
        const blockCounts = new Map();
        const blockPositions = new Map();

        // Count blocks by type and collect positions
        for (const block of blocks) {
            if (block.type === BLOCK_TYPES.AIR) continue; // Skip AIR blocks (empty space)
            if (!blockCounts.has(block.type)) {
                blockCounts.set(block.type, 0);
                blockPositions.set(block.type, []);
            }

            const worldPos = { x: block.x, y: block.y, z: block.z };
            const threePos = CoordinateConverter.worldToThree.position(worldPos);
            blockPositions.get(block.type).push(threePos);
            blockCounts.set(block.type, blockCounts.get(block.type) + 1);
        }

        const instancedMeshes = new Map();

        // Create instanced meshes for each block type
        for (const [blockType, count] of blockCounts) {
            if (count > 0) {
                const material = Array.isArray(this.materials[blockType])
                    ? this.materials[blockType]
                    : Array(6).fill(this.materials[blockType]);

                const instancedMesh = new THREE.InstancedMesh(
                    this.blockGeometry,
                    material,
                    count
                );
                instancedMesh.castShadow = true;
                instancedMesh.receiveShadow = true;

                let instanceIndex = 0;
                for (const pos of blockPositions.get(blockType)) {
                    this.position.set(pos.x, pos.y, pos.z);
                    this.matrix.compose(this.position, this.quaternion, this.scale);
                    instancedMesh.setMatrixAt(instanceIndex, this.matrix);
                    instanceIndex++;
                }

                instancedMesh.instanceMatrix.needsUpdate = true;
                targetGroup.add(instancedMesh);
                instancedMeshes.set(blockType, instancedMesh);
            }
        }

        return instancedMeshes;
    }

    /**
     * Generates a surface mesh (heightmap) for a chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkY - Chunk Y coordinate
     * @param {number} playerX - Player X coordinate
     * @param {number} playerY - Player Y coordinate
     * @returns {THREE.Group} Group containing the surface mesh and water planes
     */
    generateSurfaceMeshChunk(chunkX, chunkY, playerX, playerY) {
        const group = new THREE.Group();
        const resolution = this.CHUNK_SIZE + 1; // One more vertex than blocks for seamless edges
        const geometry = new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE, this.CHUNK_SIZE, this.CHUNK_SIZE);
        // Set vertex heights
        for (let x = 0; x <= this.CHUNK_SIZE; x++) {
            for (let y = 0; y <= this.CHUNK_SIZE; y++) {
                const worldX = chunkX * this.CHUNK_SIZE + x;
                const worldY = chunkY * this.CHUNK_SIZE + y;
                const height = TerrainGenerator.getTerrainDetail(worldX, worldY);
                const vertIndex = y * (this.CHUNK_SIZE + 1) + x;
                geometry.attributes.position.setZ(vertIndex, height);
            }
        }
        geometry.computeVertexNormals();
        const material = new THREE.MeshLambertMaterial({ color: 0x4CAF50, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        // Orient and position mesh to match chunk
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
            chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
            0,
            chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2
        );
        group.add(mesh);
        // Add water planes if needed
        let minHeight = Infinity;
        for (let x = 0; x <= this.CHUNK_SIZE; x++) {
            for (let y = 0; y <= this.CHUNK_SIZE; y++) {
                const worldX = chunkX * this.CHUNK_SIZE + x;
                const worldY = chunkY * this.CHUNK_SIZE + y;
                const height = TerrainGenerator.getTerrainHeight(worldX, worldY);
                minHeight = Math.min(minHeight, height);
            }
        }
        if (minHeight < 0) {
            const waterPlane = new THREE.Mesh(
                this.waterGeometry,
                this.waterSurfaceMaterial
            );
            waterPlane.position.set(
                chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
                0,
                chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2
            );
            waterPlane.rotation.x = -Math.PI / 2;
            group.add(waterPlane);
        }
        return group;
    }
}

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.World = World;
    window.BLOCK_TYPES = BLOCK_TYPES;
} else {
    module.exports = { World, BLOCK_TYPES };
}
