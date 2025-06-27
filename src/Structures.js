const Structures = {
    wallHeight: 5,

    ROOF_TYPES: {
        PYRAMID: 'PYRAMID',
        FLAT: 'FLAT'
    },

    STYLES : {
        MARBLE:     { trim: BLOCK_TYPES.STONE,  wall: BLOCK_TYPES.GLASS, roof: BLOCK_TYPES.MARBLE, window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.AIR, pillar: BLOCK_TYPES.MARBLE, roofType: 'PYRAMID' },
        WOOD:       { trim: BLOCK_TYPES.WOOD,   wall: BLOCK_TYPES.WOOD,  roof: BLOCK_TYPES.WOOD,   window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.AIR,   pillar: BLOCK_TYPES.WOOD,   roofType: 'PYRAMID' },
        STONE:      { trim: BLOCK_TYPES.STONE,  wall: BLOCK_TYPES.STONE, roof: BLOCK_TYPES.STONE,  window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.AIR,  pillar: BLOCK_TYPES.STONE,  roofType: 'PYRAMID' },
        WOOD_STONE: { trim: BLOCK_TYPES.WOOD,   wall: BLOCK_TYPES.STONE, roof: BLOCK_TYPES.WOOD,   window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.WOOD,   pillar: BLOCK_TYPES.WOOD,   roofType: 'PYRAMID' },
        STONE_WOOD: { trim: BLOCK_TYPES.STONE,  wall: BLOCK_TYPES.WOOD,  roof: BLOCK_TYPES.STONE,  window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.STONE,  pillar: BLOCK_TYPES.STONE,  roofType: 'PYRAMID' },
        STONE_GLASS: { trim: BLOCK_TYPES.STONE, wall: BLOCK_TYPES.GLASS, roof: BLOCK_TYPES.STONE,  window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.AIR,  pillar: BLOCK_TYPES.STONE,  roofType: 'FLAT' },
        MARBLE2:    { trim: BLOCK_TYPES.STONE,  wall: BLOCK_TYPES.STONE, roof: BLOCK_TYPES.GLASS, window: BLOCK_TYPES.GRASS, door: BLOCK_TYPES.MARBLE, pillar: BLOCK_TYPES.MARBLE, roofType: 'FLAT' },
        WOOD2:      { trim: BLOCK_TYPES.WOOD,   wall: BLOCK_TYPES.WOOD,  roof: BLOCK_TYPES.GLASS,  window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.WOOD,   pillar: BLOCK_TYPES.WOOD,   roofType: 'PYRAMID' },
        WOOD3:      { trim: BLOCK_TYPES.WOOD,   wall: BLOCK_TYPES.WOOD,  roof: BLOCK_TYPES.WOOD,  window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.WOOD,   pillar: BLOCK_TYPES.WOOD,   roofType: 'PYRAMID' },
        GAZEBO:      { trim: BLOCK_TYPES.STONE,   wall: BLOCK_TYPES.AIR,  roof: BLOCK_TYPES.WOOD,  window: BLOCK_TYPES.AIR, door: BLOCK_TYPES.AIR,   pillar: BLOCK_TYPES.WOOD,   roofType: 'FLAT' },
        //WOOD_LEAVES: { trim: BLOCK_TYPES.WOOD, wall: BLOCK_TYPES.LEAVES, roof: BLOCK_TYPES.WOOD, window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.WOOD, pillar: BLOCK_TYPES.WOOD },
        //LEAVES_WOOD: { trim: BLOCK_TYPES.WOOD, wall: BLOCK_TYPES.WOOD, roof: BLOCK_TYPES.WOOD, window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.WOOD, pillar: BLOCK_TYPES.WOOD },
        //LEAVES_STONE: { trim: BLOCK_TYPES.STONE, wall: BLOCK_TYPES.STONE, roof: BLOCK_TYPES.STONE, window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.STONE, pillar: BLOCK_TYPES.STONE },
        //LEAVES_SAND: { trim: BLOCK_TYPES.SAND, wall: BLOCK_TYPES.SAND, roof: BLOCK_TYPES.SAND, window: BLOCK_TYPES.GLASS, door: BLOCK_TYPES.SAND, pillar: BLOCK_TYPES.SAND },
    }, 

    terrainOverrides : [],   // → [{ xMin, xMax, yMin, yMax, height }, ...]

    resetTerrainOverrides() {
        this.terrainOverrides = [];
    },

    addTerrainOverride(x1, y1, x2, y2, fixedHeight) {
        if(this.getTerrainOverride(x1, y1) === fixedHeight) return;
        
        this.terrainOverrides.push({
            xMin: Math.min(x1, x2),
            xMax: Math.max(x1, x2),
            yMin: Math.min(y1, y2),
            yMax: Math.max(y1, y2),
            height: fixedHeight
        });
    },

    getTerrainOverride(x, y) {
        // Walk backwards so the most recently added rectangle "wins" on overlap.
        for (let i = this.terrainOverrides.length - 1; i >= 0; i--) {
            const r = this.terrainOverrides[i];
            if (x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax) {
            return r.height;
            }
        }
        return undefined;
    },

    getTerrainOverrideForZ(x, y, z) {
        // Walk backwards so the most recently added rectangle "wins" on overlap.
        for (let i = this.terrainOverrides.length - 1; i >= 0; i--) {
            const r = this.terrainOverrides[i];
            if (x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax) {
                if(z >= r.height) { 
                    // If the z is greater than the override, then we can use the override
                    return r.height;
                } else {
                    // If the z is less than the override height, then we can ignore the override
                }
            }
        }
        return undefined;
    },

    
    isBuildable(x, y) {
        const x1 = x - 5;
        const x2 = x + 5;
        const y1 = y - 5;
        const y2 = y + 5;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const lowest = Math.min(h11,h12,h21,h22);
        const highest = Math.max(h11,h12,h21,h22);
        const diff = highest - lowest;
        return diff < 7 && lowest >= 0;
    },

    createTree(x, y, groundHeight) {
        const blocks = [];
        const trunkHeight = 4 + (Math.abs(x + y) % 8);
        for(let z = 0; z < trunkHeight; z++) {
            blocks.push({ x, y, z: groundHeight + 1 + z, type: BLOCK_TYPES.WOOD });
        }

        const leavesBaseZ = groundHeight + 1 + trunkHeight;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
                    if (dz === -1 && (Math.abs(dx) === 2 || Math.abs(dy) === 2)) continue;
                    blocks.push({ x: x + dx, y: y + dy, z: leavesBaseZ + dz, type: BLOCK_TYPES.LEAVES });
                }
            }
        }

        //Structures.addTerrainOverride(x - 2, y - 2, x + 2, y + 2, leavesBaseZ + 1);

        return blocks;
    },



    createPillar(x, y, bottom, top, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for(let z = bottom; z <= top; z++) { blocks.push({ x, y, z, type }); }
        return blocks;
    },

    createFloor(x1, y1, x2, y2, z, type = BLOCK_TYPES.SAND) {
        const blocks = [];
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                blocks.push({ x, y, z, type });
            }
        }
        this.addTerrainOverride(x1, y1, x2, y2, z);
        return blocks;
    },

    createXWall(x1, x2, y, foundationZ, hasWindow = true, hasDoor = false, style = STYLES.WOOD) {
        const blocks = [];
        const gapLocation = Math.floor((x1 + x2) / 2);
        const gapBottom = hasWindow ? foundationZ + 1 : foundationZ;
        const gapTop = foundationZ + 4;

        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let z = foundationZ; z <= foundationZ + this.wallHeight; z++) {
                const isCorner = (x === x1 || x == x2);
                const isGap = (hasWindow || hasDoor ) && (z > gapBottom &&  z < gapTop && (x === gapLocation || x === gapLocation + 1));
                if(isCorner) {
                    blocks.push({ x, y, z, type: style.trim });
                } if(!isGap) {
                    blocks.push({ x, y, z, type: style.wall });
                } else if(hasWindow) {
                    blocks.push({ x, y, z, type: style.window });
                } else if(hasDoor) {
                    blocks.push({ x, y, z, type: style.door });
                }
            }
        }
        return blocks;
    },

    createYWall(y1, y2, x, foundationZ, hasWindow = true, hasDoor = false, style = STYLES.WOOD_STONE) {
        const blocks = [];
        const gapLocation = Math.floor((y1 + y2) / 2);
        const gapBottom = hasWindow ? foundationZ + 1 : foundationZ;
        const gapTop = foundationZ + 4;

        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let z = foundationZ; z <= foundationZ + this.wallHeight; z++) {
                const isGap = (hasWindow || hasDoor ) && (z > gapBottom &&  z < gapTop && (y === gapLocation || y === gapLocation + 1));
                const isCorner = (y === y1 || y === y2);
                if(isCorner) {
                    blocks.push({ x, y, z, type:style.trim });
                } else if(!isGap) {
                    blocks.push({ x, y, z, type:style.wall });
                } else if(hasWindow) {
                    blocks.push({ x, y, z, type: style.window });
                } else if(hasDoor) {
                    blocks.push({ x, y, z, type: style.door });
                }
            }
        }
        return blocks;
    },

    // Actually creates a Hip roof. See https://primeroofingfl.com/blog/gable-roofs-info/ 
    createPyramidRoof(x1, y1, x2, y2, z, type = BLOCK_TYPES.WOOD) {
        const blocks = [];

        const startY = Math.min(y1, y2);
        const stopY = Math.max(y1, y2);
        const startX = Math.min(x1, x2);
        const stopX = Math.max(x1, x2);
        const width = stopX - startX;
        const depth = stopY - startY;
        const layers = Math.ceil(Math.min(width, depth) / 2);

        for(let layer = 0; layer <= layers; layer++) {
            const layerZ = z + layer;
            const xOffset = layer;
            const yOffset = layer;

            // Create the edges of the roof for this layer
            for (let x = startX + xOffset; x <= stopX - xOffset; x++) {
                blocks.push({ x, y: startY + yOffset, z: layerZ, type });
                blocks.push({ x, y: stopY - yOffset, z: layerZ, type });
            }
            for (let y = startY + yOffset; y <= stopY - yOffset; y++) {
                blocks.push({ x: startX + xOffset, y, z: layerZ, type });
                blocks.push({ x: stopX - xOffset, y, z: layerZ, type });
            }
        }
        return blocks;
    },

    createRoof(x1, y1, x2, y2, z, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        for (let x = Math.min(x1, x2) - 1; x <= Math.max(x1, x2) + 1; x++) {
            for (let y = Math.min(y1, y2) - 1; y <= Math.max(y1, y2) + 1; y++) {
                blocks.push({ x, y, z, type });
            }
        }
        return blocks;
    }

};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Structures = Structures;
} else {
    module.exports = Structures;
} 
