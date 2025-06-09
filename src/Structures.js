//const { BLOCK_TYPES } = require("./World");

const Structures = {
    wallHeight: 5,

    terrainOverrides : [],   // → [{ xMin, xMax, yMin, yMax, height }, ...]

    addTerrainOverride(x1, y1, x2, y2, fixedHeight) {
        this.terrainOverrides.push({
            xMin: Math.min(x1, x2),
            xMax: Math.max(x1, x2),
            yMin: Math.min(y1, y2),
            yMax: Math.max(y1, y2),
            height: fixedHeight
        });
    },

    getTerrainOverride(x, y) {
        // Walk backwards so the most recently added rectangle “wins” on overlap.
        for (let i = this.terrainOverrides.length - 1; i >= 0; i--) {
            const r = this.terrainOverrides[i];
            if (x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax) {
            return r.height;
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

        return {
            type: STRUCTURE_TYPES.TREE,
            blocks: blocks,
            metadata: {
                height: trunkHeight,
                groundHeight: groundHeight
            }
        };
    },


    createHouse(centerX, centerY, size = 10) {
        const blocks = [];

        const x1 = centerX - Math.floor(size / 2);
        const x2 = centerX + Math.floor(size / 2);
        const y1 = centerY - Math.floor(size / 2);
        const y2 = centerY + Math.floor(size / 2);

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const foundationZ = Math.max(h11,h12,h21,h22);

        //Create pillars to support elevated floor
        blocks.push(...this.createPillar(x1, y1, h11, foundationZ));
        blocks.push(...this.createPillar(x1, y2, h12, foundationZ));
        blocks.push(...this.createPillar(x2, y1, h21, foundationZ));
        blocks.push(...this.createPillar(x2, y2, h22, foundationZ));

        //create floor
        blocks.push(...this.createFloor(x1, y1, x2, y2, foundationZ));
        
        //create walls  
        blocks.push(...this.createXWall(x1, x2, y1, foundationZ, false, true));
        blocks.push(...this.createXWall(x1, x2, y2, foundationZ));
        blocks.push(...this.createYWall(y1, y2, x1, foundationZ));
        blocks.push(...this.createYWall(y1, y2, x2, foundationZ));
        
        //create roof
        blocks.push(...this.createRoof(x1, y1, x2, y2, foundationZ + this.wallHeight));

        return {
            type: STRUCTURE_TYPES.HOUSE,
            blocks: blocks,
            metadata: {
                //height: height,
                groundHeight: foundationZ
            }
        };
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

    createXWall(x1, x2, y, foundationZ, hasWindow = true, hasDoor = false, type = BLOCK_TYPES.WOOD) {
        const blocks = [];
        const gapLocation = Math.floor((x1 + x2) / 2);
        const gapBottom = hasWindow ? foundationZ + 1 : foundationZ;
        const gapTop = foundationZ + 4;

        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let z = foundationZ; z <= foundationZ + this.wallHeight; z++) {
                const isCorner = (x === x1 || x == x2);
                const isGap = (hasWindow || hasDoor ) && (z > gapBottom &&  z < gapTop && (x === gapLocation || x === gapLocation + 1));
                if(isCorner) {
                    blocks.push({ x, y, z, type });
                } if(!isGap) {
                    blocks.push({ x, y, z, type });
                } else if(hasWindow) {
                    blocks.push({ x, y, z, type: BLOCK_TYPES.GLASS });
                } else if(hasDoor) {
                    // No Op
                }
            }
        }
        return blocks;
    },

    createYWall(y1, y2, x, foundationZ, hasWindow = true, hasDoor = false, type = BLOCK_TYPES.STONE) {
        const blocks = [];
        const gapLocation = Math.floor((y1 + y2) / 2);
        const gapBottom = hasWindow ? foundationZ + 1 : foundationZ;
        const gapTop = foundationZ + 4;

        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let z = foundationZ; z <= foundationZ + this.wallHeight; z++) {
                const isGap = (hasWindow || hasDoor ) && (z > gapBottom &&  z < gapTop && (y === gapLocation || y === gapLocation + 1));
                const isCorner = (y === y1 || y === y2);
                if(!isGap) {
                    blocks.push({ x, y, z, type });
                } else if(hasWindow) {
                    blocks.push({ x, y, z, type: BLOCK_TYPES.GLASS });
                } else if(hasDoor) {
                    // No Op
                }
            }
        }
        return blocks;
    },

    
    createPyramidRoof(x1, y1, x2, y2, z, type = BLOCK_TYPES.WOOD) {
        const blocks = [];

        const startY = Math.min(y1, y2);
        const stopY = Math.max(y1, y2);
        const startX = Math.min(x1, x2);
        const stopX = Math.max(x1, x2);
        const layers = Math.ceil((stopY - startY) / 2);

        for(let layer = z; layer < z + layers; layer++) {        
            blocks.push(...this.createRoof(x1++, y1++, x2--, y2--, layer, type = BLOCK_TYPES.WOOD));
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
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 