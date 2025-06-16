// Block type constants
const BLOCK_TYPES = {
    GRASS: 0,
    DIRT: 1,
    STONE: 2,
    SAND: 3,
    WOOD: 4,
    LEAVES: 5,
    GLASS: 6
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

        const random = (x, y) => {
            const a = ((x * 1231) + (y * 5897)) % 123456789;
            // Mix the bits using XOR and shifts
            let b = a;
            b = (b ^ (b << 13)) & 0x7fffffff;
            b = (b ^ (b >> 17)) & 0x7fffffff;
            b = (b ^ (b << 5)) & 0x7fffffff;
            // Normalize to 0-1 range
            return b / 0x7fffffff;
        };

        for (let i = 0; i < treesPerChunk; i++) {
            const localX = Math.floor(random(chunkX * i, chunkY) * this.CHUNK_SIZE);
            const localY = Math.floor(random(chunkX, chunkY * i) * this.CHUNK_SIZE);

            const worldX = chunkX * this.CHUNK_SIZE + localX;
            const worldY = chunkY * this.CHUNK_SIZE + localY;
            const height = TerrainGenerator.getTerrainHeight(worldX, worldY);

            // Apply LOD-based tree chance
            if (height > 0 && random(worldX, worldY) < lodLevel.treeChance) {
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

    generateChunk(chunkX, chunkY, playerX, playerY) {
        const startTime = performance.now();
        const chunkKey = `${chunkX},${chunkY}`;

        // Calculate LOD level based on actual distance to player
        const distance = this.getChunkDistance(chunkX, chunkY, playerX, playerY);
        const lodLevel = this.getLODLevel(distance);
        
        // Check if chunk exists and needs LOD update
        if (this.chunks.has(chunkKey)) {
            const currentLOD = this.chunkLODs.get(chunkKey);
            if (currentLOD === lodLevel) {
                return; // Same LOD level, no update needed
            }
            //If the LOD is only one level higher, we can keep it as is.
            //TODO: Implement this.

            // Different LOD level, remove old chunk
            this.scene.remove(this.chunks.get(chunkKey));
            this.chunks.delete(chunkKey);
            this.chunkLODs.delete(chunkKey);
        }

        const blockSize = lodLevel.blockSize;
        const samplingStep = blockSize; // Sample terrain at block resolution

        const chunkGroup = new THREE.Group();
        const instanceCounts = new Map();
        const blockPositions = new Map();

        let blockCount = 0;
        let waterCount = 0;

        // Find minimum height in chunk for water - sample at reduced resolution
        let minHeight = Infinity;
        let maxHeight = -Infinity;
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

        // Add water planes if needed
        if (minHeight < 0) {
            const skipFactor = lodLevel.waterDetail;
            for (let depth = 0; depth >= minHeight; depth -= skipFactor) {
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
                //waterPlane.receiveShadow = true;
                chunkGroup.add(waterPlane);
                waterCount++;
            }
        }


        // Generate terrain blocks - sample at reduced resolution based on block size
        for (let x = 0; x < this.CHUNK_SIZE; x += samplingStep) {
            for (let y = 0; y < this.CHUNK_SIZE; y += samplingStep) {
                const worldX = chunkX * this.CHUNK_SIZE + x;
                const worldY = chunkY * this.CHUNK_SIZE + y;
                const height = TerrainGenerator.getTerrainHeight(worldX, worldY);
                const isCliff = TerrainGenerator.isCliff(worldX, worldY);

                const startZ = Math.floor(height);
                const bottomZ = Math.min(-5, startZ);

                // Reduce vertical sampling for larger blocks
                const zStep = blockSize;

                for (let z = bottomZ; z <= startZ; z += zStep) {
                    let blockType;

                    if (height >= 0) {
                        if (z === startZ || (z > startZ - blockSize && z <= startZ)) {
                            blockType = BLOCK_TYPES.GRASS;
                        } else if (isCliff && z > startZ - 2 * blockSize) {
                            blockType = BLOCK_TYPES.DIRT;
                        } else if(isCliff) {
                            blockType = BLOCK_TYPES.STONE;
                        }
                    } else {
                        if(z === startZ || (z > startZ - blockSize && z <= startZ)) {
                            blockType = BLOCK_TYPES.SAND;
                        } else if(isCliff) {
                            blockType = BLOCK_TYPES.STONE;
                        }
                    }

                    blockCount++;
                    if (!instanceCounts.has(blockType)) {
                        instanceCounts.set(blockType, 0);
                        blockPositions.set(blockType, []);
                    }

                    // Position the center of larger blocks correctly
                    const blockCenterOffset = (blockSize - 1) / 2;
                    const worldPos = { 
                        x: worldX + blockCenterOffset, 
                        y: worldY + blockCenterOffset, 
                        z: z + blockCenterOffset 
                    };
                    const threePos = CoordinateConverter.worldToThree.position(worldPos);
                    blockPositions.get(blockType).push({...threePos, blockSize});
                    instanceCounts.set(blockType, instanceCounts.get(blockType) + 1);
                }
            }
        }

        //if ((this.mod(chunkX, 10) < 4 && this.mod(chunkY, 10) < 4) && blockSize === 1) { // Only build houses on high-detail chunks
            const centerX = chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
            const centerY = chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
            if(Houses.isBuildable(chunkX, chunkY, centerX, centerY)) {
                let houseBlocks = Houses.createHouse(centerX, centerY);
                this.generateBlocks(houseBlocks, chunkGroup);
            }
        //}

        // Create instanced meshes for terrain blocks - group by block size
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

        for (const [size, blockTypeMap] of blocksBySize) {
            // Choose geometry based on block size
            let geometry;
            if (size === 1) {
                geometry = this.blockGeometry;
            } else if (size === 2) {
                geometry = this.blockGeometry2x;
            } else {
                geometry = this.blockGeometry4x;
            }

            // This loop creates instanced meshes for each block type and size.
            // It also sets the matrix for each instance, which is used to position the blocks in the world.
            // It also sets the material for each instance, which is used to color the blocks.
            // It also sets the shadow settings for each instance, which is used to cast and receive shadows.
            // It also sets the instance matrix needs update flag, which is used to update the matrix for each instance.
            // It also adds the instanced mesh to the chunk group.
            // It also updates the instance matrix needs update flag.
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

        // Generate trees with LOD-based density
        const chunkTrees = this.generateTreePositionsForChunk(chunkX, chunkY, lodLevel);
        this.generateTreesInChunk(chunkGroup, chunkX, chunkY, chunkTrees);

        this.chunks.set(chunkKey, chunkGroup);
        this.chunkLODs.set(chunkKey, lodLevel); // Store the LOD level
        this.scene.add(chunkGroup);

        // Update statistics
        const endTime = performance.now();
        const genTime = endTime - startTime;

        this.stats.loadedChunks = this.chunks.size;
        this.stats.totalBlocksRendered += blockCount;
        this.stats.waterPlanesRendered += waterCount;
        this.stats.treesGenerated += chunkTrees.length;
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

    update(playerX, playerY) {
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
                    this.generateChunk(x, y, playerX, playerY);
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
}

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.World = World;
    window.BLOCK_TYPES = BLOCK_TYPES;
} else {
    module.exports = { World, BLOCK_TYPES };
}
