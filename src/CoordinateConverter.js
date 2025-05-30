const CoordinateConverter = {
    worldToThree: {
        position: (worldPos) => ({
            x: worldPos.x,
            y: worldPos.z,
            z: worldPos.y
        }),
        rotation: (worldRot) => ({
            x: worldRot.x,
            y: worldRot.y,
            z: 0
        }),
        size: (worldSize) => ({
            x: worldSize.x,
            y: worldSize.z,
            z: worldSize.y
        })
    },
    threeToWorld: {
        position: (threePos) => ({
            x: threePos.x,
            y: threePos.z,
            z: threePos.y
        }),
        rotation: (threeRot) => ({
            x: threeRot.x,
            y: threeRot.y
        })
    }
};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.CoordinateConverter = CoordinateConverter;
} else {
    module.exports = CoordinateConverter;
} 