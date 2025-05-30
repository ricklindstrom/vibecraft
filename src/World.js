// Block type constants
const BLOCK_TYPES = {
    GRASS: 0,
    DIRT: 1,
    STONE: 2,
    SAND: 3,
    WOOD: 4,
    LEAVES: 5
};

class World {
    constructor(scene, chunkSize = 16, renderDistance = 3) {
        this.scene = scene;
        this.CHUNK_SIZE = chunkSize;
        this.RENDER_DISTANCE = renderDistance;
        this.CLEAN_DISTANCE = renderDistance + 1;
        this.chunks = new Map();
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
        this.materials = this.createMaterials();
        this.waterGeometry = new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE);
        this.waterMaterial = new THREE.MeshPhongMaterial({
            color: 0x004d99,
            transparent: true,
            opacity: 0.3,
            shininess: 10,
            specular: 0x222244,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
        });
        // Shiny water surface material
        this.waterSurfaceMaterial = new THREE.MeshPhongMaterial({
            color: 0x3399ff,
            transparent: true,
            opacity: 0.45,
            shininess: 120,
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
            [BLOCK_TYPES.LEAVES]: new THREE.MeshLambertMaterial({
                color: 0x228B22,
                transparent: true,
                opacity: 0.8
            })
        };
    }

    generateTreePositionsForChunk(chunkX, chunkY) {
        const chunkTrees = [];
        const treesPerChunk = Math.floor(2000 / (this.RENDER_DISTANCE * this.RENDER_DISTANCE * 4));

        const random = (x, y) => {
            const a = x * 12345 + y * 67890;
            const b = a << 13 ^ a;
            return ((b * (b * b * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
        };

        for (let i = 0; i < treesPerChunk; i++) {
            const localX = Math.floor(random(chunkX * i, chunkY) * this.CHUNK_SIZE);
            const localY = Math.floor(random(chunkX, chunkY * i) * this.CHUNK_SIZE);

            const worldX = chunkX * this.CHUNK_SIZE + localX;
            const worldY = chunkY * this.CHUNK_SIZE + localY;
            const height = TerrainGenerator.getTerrainHeight(worldX, worldY);

            if (height > 0 && random(worldX, worldY) < 0.7) {
                chunkTrees.push({ x: worldX, y: worldY, groundHeight: height });
            }
        }

        return chunkTrees;
    }

    generateTreesInChunk(chunkGroup, chunkX, chunkY, instanceCounts, blockPositions, chunkTrees) {
        const treeBlockCounts = new Map();
        const treeBlockPositions = new Map();

        chunkTrees.forEach(tree => {
            const localX = tree.x - chunkX * this.CHUNK_SIZE;
            const localY = tree.y - chunkY * this.CHUNK_SIZE;

            if (localX >= 0 && localX < this.CHUNK_SIZE && localY >= 0 && localY < this.CHUNK_SIZE) {
                const trunkHeight = 4 + Math.floor(Math.random() * 3);

                // Add trunk blocks
                if (!treeBlockCounts.has(BLOCK_TYPES.WOOD)) {
                    treeBlockCounts.set(BLOCK_TYPES.WOOD, 0);
                    treeBlockPositions.set(BLOCK_TYPES.WOOD, []);
                }

                for (let z = 0; z < trunkHeight; z++) {
                    const worldPos = {
                        x: tree.x,
                        y: tree.y,
                        z: tree.groundHeight + 1 + z
                    };
                    const threePos = CoordinateConverter.worldToThree.position(worldPos);
                    treeBlockPositions.get(BLOCK_TYPES.WOOD).push(threePos);
                    treeBlockCounts.set(BLOCK_TYPES.WOOD, treeBlockCounts.get(BLOCK_TYPES.WOOD) + 1);
                }

                // Add leaves
                if (!treeBlockCounts.has(BLOCK_TYPES.LEAVES)) {
                    treeBlockCounts.set(BLOCK_TYPES.LEAVES, 0);
                    treeBlockPositions.set(BLOCK_TYPES.LEAVES, []);
                }

                const leavesBaseZ = tree.groundHeight + 1 + trunkHeight;
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dz = -1; dz <= 1; dz++) {
                            if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
                            if (dz === -1 && (Math.abs(dx) === 2 || Math.abs(dy) === 2)) continue;

                            const worldPos = {
                                x: tree.x + dx,
                                y: tree.y + dy,
                                z: leavesBaseZ + dz
                            };
                            const threePos = CoordinateConverter.worldToThree.position(worldPos);
                            treeBlockPositions.get(BLOCK_TYPES.LEAVES).push(threePos);
                            treeBlockCounts.set(BLOCK_TYPES.LEAVES, treeBlockCounts.get(BLOCK_TYPES.LEAVES) + 1);
                        }
                    }
                }
            }
        });

        // Create instanced meshes for tree blocks
        for (const [blockType, count] of treeBlockCounts) {
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
                for (const pos of treeBlockPositions.get(blockType)) {
                    this.position.set(pos.x, pos.y, pos.z);
                    this.matrix.compose(this.position, this.quaternion, this.scale);
                    instancedMesh.setMatrixAt(instanceIndex, this.matrix);
                    instanceIndex++;
                }

                instancedMesh.instanceMatrix.needsUpdate = true;
                chunkGroup.add(instancedMesh);
            }
        }
    }

    generateChunk(chunkX, chunkY) {
        const startTime = performance.now();
        const chunkKey = `${chunkX},${chunkY}`;
        if (this.chunks.has(chunkKey)) return;

        const chunkGroup = new THREE.Group();
        const instanceCounts = new Map();
        const blockPositions = new Map();
        
        let blockCount = 0;
        let waterCount = 0;
        
        // Find minimum height in chunk for water
        let minHeight = Infinity;
        let maxHeight = -Infinity;
        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let y = 0; y < this.CHUNK_SIZE; y++) {
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
            for (let depth = 0; depth >= minHeight; depth--) {
                // Use shiny surface material only for the topmost water layer
                const isSurface = (depth === 0);
                const waterPlane = new THREE.Mesh(
                    this.waterGeometry,
                    isSurface ? this.waterSurfaceMaterial : this.waterMaterial
                );
                const waterPos = CoordinateConverter.worldToThree.position({
                    x: chunkX * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
                    y: chunkY * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
                    z: depth
                });
                waterPlane.position.set(waterPos.x, waterPos.y, waterPos.z);
                waterPlane.rotation.x = -Math.PI / 2;
                waterPlane.receiveShadow = true;
                chunkGroup.add(waterPlane);
                waterCount++;
            }
        }
        
        // Generate terrain blocks
        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let y = 0; y < this.CHUNK_SIZE; y++) {
                const worldX = chunkX * this.CHUNK_SIZE + x;
                const worldY = chunkY * this.CHUNK_SIZE + y;
                const height = TerrainGenerator.getTerrainHeight(worldX, worldY);
                
                const startZ = Math.floor(height);
                const bottomZ = Math.min(-5, startZ);
                
                for (let z = bottomZ; z <= startZ; z++) {
                    blockCount++;
                    let blockType;

                    if (height >= 0) {
                        if (z === startZ) {
                            blockType = BLOCK_TYPES.GRASS;
                        } else if (z > startZ - 2) {
                            blockType = BLOCK_TYPES.DIRT;
                        } else {
                            blockType = BLOCK_TYPES.STONE;
                        }
                    } else {
                        if(z === startZ) {
                            blockType = BLOCK_TYPES.SAND;
                        } else {
                            blockType = BLOCK_TYPES.STONE;
                        }
                    }

                    if (!instanceCounts.has(blockType)) {
                        instanceCounts.set(blockType, 0);
                        blockPositions.set(blockType, []);
                    }

                    const worldPos = { x: worldX, y: worldY, z: z };
                    const threePos = CoordinateConverter.worldToThree.position(worldPos);
                    blockPositions.get(blockType).push(threePos);
                    instanceCounts.set(blockType, instanceCounts.get(blockType) + 1);
                }
            }
        }

        // Create instanced meshes for terrain blocks
        for (const [blockType, count] of instanceCounts) {
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
                chunkGroup.add(instancedMesh);
            }
        }

        // Generate trees
        const chunkTrees = this.generateTreePositionsForChunk(chunkX, chunkY);
        this.generateTreesInChunk(chunkGroup, chunkX, chunkY, instanceCounts, blockPositions, chunkTrees);
        
        this.chunks.set(chunkKey, chunkGroup);
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
        if (this.stats.chunkGenTimeHistory.length > 10) {
            this.stats.chunkGenTimeHistory.shift();
        }
        this.stats.averageChunkGenTime = this.stats.chunkGenTimeHistory.reduce((a, b) => a + b, 0) / 
                                       this.stats.chunkGenTimeHistory.length;

        // Estimate memory usage (rough approximation)
        const BYTES_PER_BLOCK = 32; // Rough estimate including position, material refs, etc.
        const BYTES_PER_WATER = 128; // Water planes are more complex
        const BYTES_PER_TREE = 256; // Trees have multiple blocks and leaves
        this.stats.memoryUsed = (this.stats.totalBlocksRendered * BYTES_PER_BLOCK + 
                                this.stats.waterPlanesRendered * BYTES_PER_WATER +
                                this.stats.treesGenerated * BYTES_PER_TREE) / (1024 * 1024); // Convert to MB
    }

    update(playerX, playerY) {
        const playerChunkX = Math.floor(playerX / this.CHUNK_SIZE);
        const playerChunkY = Math.floor(playerY / this.CHUNK_SIZE);
        
        this.stats.currentPlayerChunk = { x: playerChunkX, y: playerChunkY };
        
        // Generate or remove chunks based on render distance
        for (let x = playerChunkX - this.RENDER_DISTANCE; x <= playerChunkX + this.RENDER_DISTANCE; x++) {
            for (let y = playerChunkY - this.RENDER_DISTANCE; y <= playerChunkY + this.RENDER_DISTANCE; y++) {
                this.generateChunk(x, y);
            }
        }

        // Optional: Remove chunks that are too far away
        for (const [key, chunk] of this.chunks) {
            const [chunkX, chunkY] = key.split(',').map(Number);
            if (Math.abs(chunkX - playerChunkX) > this.CLEAN_DISTANCE ||
                Math.abs(chunkY - playerChunkY) > this.CLEAN_DISTANCE) {
                this.scene.remove(chunk);
                this.chunks.delete(key);
                this.stats.loadedChunks = this.chunks.size;
            }
        }
    }

    getStats() {
        return this.stats;
    }
}

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.World = World;
    window.BLOCK_TYPES = BLOCK_TYPES;
} else {
    module.exports = { World, BLOCK_TYPES };
}
