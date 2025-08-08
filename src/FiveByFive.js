const FiveByFive = {

    // Better mathmatical modulo that works for negative numbers
    mod(x, n) {
        return ((x % n) + n) % n;
    },

    isBuildable(chunkX, chunkY, x, y) {
        // Only build on even chunks
        if(this.mod(chunkX, 2) !== 0 || this.mod(chunkY, 2) !== 0) return false;
        
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
        if(diff > 7 || lowest < 0) return false;

        return true;
        // return this.random(chunkX, chunkY) > 0.5 && this.random(chunkY, chunkX) > 0.5;
    },

    //Hash-based stable random number between 0 and 1
    random(x, y) {
        return Math.abs(Math.floor(x * 19349663 + y * 73856093)) % 100000 / 100000;
    },

    getRandomStyle(x, y) {
        const styleKeys = Object.keys(Structures.STYLES);
        //const hash = Math.abs(Math.floor(((x * 73856093) ^ (y * 19349663)) % 4294967296)) % styleKeys.length;
        const hash = Math.abs(((x * 73856093) ^ (y * 19349663))) % styleKeys.length;
        return Structures.STYLES[styleKeys[hash]];
    }, 


    createBuilding(xinit, yinit, xsize = 3, ysize = 3, floors = 3, style = undefined) {
        const blocks = [];

        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        let cellSize = 4;

        const h11 = TerrainGenerator.getTerrainHeight(xinit, yinit);
        const h12 = TerrainGenerator.getTerrainHeight(xinit, yinit + ysize * cellSize - 1);
        const h21 = TerrainGenerator.getTerrainHeight(xinit + xsize * cellSize - 1, yinit);
        const h22 = TerrainGenerator.getTerrainHeight(xinit + xsize * cellSize - 1, yinit + ysize * cellSize - 1);
        let foundationZ = Math.max(h11,h12,h21,h22) + 1;
        

        for(let f = 0; f < floors; f++) {
            for(let x = 0; x < xsize; x++) {    
                for(let y = 0; y < ysize; y++) {
                    if(x==0 && y==0) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "dw  ", cellSize, style));
                    } else if(x == 0) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), " w  ", cellSize, style));
                    } else if(y == 0) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "w   ", cellSize, style));
                    } 
                    
                    if(x==xsize-1 && y==ysize-1) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "  ww", cellSize, style));
                    } else if(x == xsize-1) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "   w", cellSize, style));
                    } else if(y == ysize-1) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "  w ", cellSize, style));
                    }   

                }
            }
        }

        return blocks;
    },

    /**
     * Create a house structure at the given center position, with optional size and style.
     * If style is not provided, a deterministic random style is chosen based on centerX and centerY.
     * @param {number} centerX
     * @param {number} centerY
     * @param {number} size
     * @param {object} style - One of Structures.STYLES
     * @returns {Array} Array of blocks
     */
    createHouse(xinit, yinit, code = "dwww", size = 4, style = undefined) {
        // Deterministic style selection if not provided
        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        const blocks = [];

        const x1 = xinit;
        const x2 = xinit + size - 1;
        const y1 = yinit;
        const y2 = yinit + size - 1;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const foundationZ = Math.max(h11,h12,h21,h22);

        //Create pillars to support elevated floor
        blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ, style.pillar));

        // //create roof
         blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ + size - 1, style));

        //Grid
         blocks.push(...Structures.createPillar(x1, y1, foundationZ, foundationZ + size - 1, style.pillar));
         blocks.push(...Structures.createPillar(x1, y2, foundationZ, foundationZ + size - 1, style.pillar));
         blocks.push(...Structures.createPillar(x2, y1, foundationZ, foundationZ + size - 1, style.pillar));
         blocks.push(...Structures.createPillar(x2, y2, foundationZ, foundationZ + size - 1, style.pillar));

        //Walls

        if(["W", "w", "D", "d"].includes(code[0])) {
            blocks.push(...Structures.createXWall(x1 + 1, x2 - 1, y1, foundationZ, code[0] == 'w', code[0] == 'd', style));
        }

        if(["W", "w", "D", "d"].includes(code[1])) {
            blocks.push(...Structures.createYWall(y1 + 1, y2 - 1, x1, foundationZ, code[1] == 'w', code[1] == 'd', style));
        }

        if(["W", "w", "D", "d"].includes(code[2])) {
            blocks.push(...Structures.createXWall(x1 + 1, x2 - 1, y2, foundationZ, code[2] == 'w', code[2] == 'd', style));
        }

        if(["W", "w", "D", "d"].includes(code[3])) {
            blocks.push(...Structures.createYWall(y1 + 1, y2 - 1, x2, foundationZ, code[3] == 'w', code[3] == 'd', style));
        }

        return blocks;
    },

    createCell(xinit, yinit, foundationZ = undefined, code = "wwww", size = 4, style = undefined) {

        if (!style) {
            // Deterministic style selection if not provided
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        const blocks = [];

        const x1 = xinit;
        const x2 = xinit + size;
        const y1 = yinit;
        const y2 = yinit + size;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        if(!foundationZ) {
            foundationZ = Math.max(h11,h12,h21,h22);
        }

        //Create pillars to support elevated floor
        blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ, style.pillar));

        // //create roof
         blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ + size - 1, style));

        //Grid
         blocks.push(...Structures.createPillar(x1, y1, foundationZ, foundationZ + size - 1, style.pillar));
         blocks.push(...Structures.createPillar(x1, y2, foundationZ, foundationZ + size - 1, style.pillar));
         blocks.push(...Structures.createPillar(x2, y1, foundationZ, foundationZ + size - 1, style.pillar));
         blocks.push(...Structures.createPillar(x2, y2, foundationZ, foundationZ + size - 1, style.pillar));

 
        //create walls
        if(["W", "w", "D", "d"].includes(code[0])) {
            blocks.push(...Structures.createXWall(x1 + 1, x2 - 1, y1, foundationZ, code[0] == 'w', code[0] == 'd', style));
        }
        if(["W", "w", "D", "d"].includes(code[1])) {
            blocks.push(...Structures.createYWall(y1 + 1, y2 - 1, x1, foundationZ, code[1] == 'w', code[1] == 'd', style));
        }
        if(["W", "w", "D", "d"].includes(code[2])) {
            blocks.push(...Structures.createXWall(x1 + 1, x2 - 1, y2, foundationZ, code[2] == 'w', code[2] == 'd', style));
        }
        if(["W", "w", "D", "d"].includes(code[3])) {
            blocks.push(...Structures.createYWall(y1 + 1, y2 - 1, x2, foundationZ, code[3] == 'w', code[3] == 'd', style));
        }

        return blocks;
    },



};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 
