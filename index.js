// Import necessary Java classes
const File = Java.type("java.io.File");
const PrintWriter = Java.type("java.io.PrintWriter");
import RenderLib from "../renderLib";

// Route offsets
const routeOffsets = [
    { dx: -22, dy: 1, dz: -7 },
    { dx: -4, dy: 0, dz: -28 },
    { dx: 8, dy: -8, dz: -10 },
    { dx: 29, dy: -5, dz: -3 },
    { dx: -6, dy: -6, dz: 0 },
    { dx: 14, dy: 14, dz: 4 },
    { dx: -12, dy: 0, dz: 9 },
    { dx: -5, dy: -3, dz: 4 },
    { dx: -4, dy: -13, dz: 20 },
    { dx: -2, dy: 2, dz: -14 },
    { dx: -5, dy: 2, dz: -11 },
    { dx: 5, dy: -2, dz: -4 },
    { dx: 14, dy: -1, dz: -9 },
    { dx: 7, dy: -1, dz: 8 },
    { dx: 0, dy: -1, dz: 23 },
    { dx: 5, dy: 0, dz: 9 },
    { dx: 0, dy: 5, dz: 6 },
    { dx: -30, dy: -2, dz: 3 },
    { dx: 24, dy: 7, dz: 5 },
    { dx: -7, dy: 5, dz: -1 },
    { dx: -9, dy: 6, dz: -4 }
];

// Keybind for starting/canceling the setup
const setupKey = new KeyBind("Start/Cancel Setup", 0, "AutoGrotto");

// Setup state
let isSettingLocation = false; // True when setup is running
let waitingForConfirmation = false; // True after first sneak
let highlightedBlock = null; // Block to highlight
let lastSneakTime = 0; // Time of the last sneak

const chatPrefix = "&0&l[&d&lAuto&d&lGrotto&0&l]&r ";

/**
 * Function to calculate waypoints in the requested format.
 * @param {number} startX Starting X coordinate.
 * @param {number} startY Starting Y coordinate.
 * @param {number} startZ Starting Z coordinate.
 * @returns {Array} Array of waypoint objects.
 */
function calculateWaypoints(startX, startY, startZ) {
    const waypoints = [];
    let current = { x: startX, y: startY, z: startZ };

    routeOffsets.forEach((offset) => {
        const nextPoint = {
            x: current.x + offset.dx,
            y: current.y + offset.dy,
            z: current.z + offset.dz
        };

        waypoints.push({
            x1: current.x, y1: current.y, z1: current.z,
            x2: nextPoint.x, y2: nextPoint.y, z2: nextPoint.z
        });

        current = nextPoint; // Update current position
    });

    return waypoints;
}

// Render the highlighted block using RenderLib
register("renderWorld", () => {
    if (!highlightedBlock) return;

    const { x, y, z } = highlightedBlock;

    // Draw an ESP box around the block
    RenderLib.drawEspBox(x+0.5, y, z+0.5, 1, 1, 1, 0.333 , 1, 1, true);
});

// Detect keybind press to start or cancel the setup
register("tick", () => {
    if (setupKey.isPressed()) {
        if (isSettingLocation || waitingForConfirmation) {
            // Cancel setup
            isSettingLocation = false;
            waitingForConfirmation = false;
            highlightedBlock = null;
            ChatLib.chat(chatPrefix + "Setup canceled.");
        } else {
            // Start setup
            isSettingLocation = true;
            ChatLib.chat(chatPrefix + "Setup started. Sneak to set the block location.");
        }
    }

    // Detect sneaking for block selection and confirmation
    if (isSettingLocation && Player.isSneaking()) {
        const currentTime = Date.now();
        if (currentTime - lastSneakTime < 500) {
            return; // Prevent rapid sneaking
        }
        lastSneakTime = currentTime;

        if (waitingForConfirmation) {
            // Confirm block location
            ChatLib.chat(chatPrefix + `Block location confirmed at [${highlightedBlock.x}, ${highlightedBlock.y}, ${highlightedBlock.z}].`);

            // Calculate waypoints and save to file
            const waypoints = calculateWaypoints(highlightedBlock.x, highlightedBlock.y, highlightedBlock.z);
            const filePath = "./config/ChatTriggers/modules/PolarConfigV2/gemstoneroutes/custom8.txt";

            const file = new File(filePath);
            file.getParentFile().mkdirs();
            const writer = new PrintWriter(file);
            writer.write(JSON.stringify(waypoints, null, 2));
            writer.close();

            ChatLib.chat(chatPrefix + `Waypoints saved to ${filePath}`);

            // Reset setup state
            isSettingLocation = false;
            waitingForConfirmation = false;
            highlightedBlock = null;
        } else {
            // First sneak: set the block and wait for confirmation
            const x = Math.floor(Player.getX());
            const y = Math.floor(Player.getY() - 1); // Adjust for standing position
            const z = Math.floor(Player.getZ());

            highlightedBlock = { x, y, z };
            waitingForConfirmation = true;
            ChatLib.chat(chatPrefix + "Block highlighted. Sneak again to confirm or press keybind to cancel.");
        }
    }
});