/**
 * with some basic configuration and lines of code, now you have a full function gateway
 */

process.env.NODE_CONFIG_DIR = __dirname;
const gateway = require('../gateway');
gateway.use(require('../gateway/plugin/freqControl'))
gateway.use(require('../gateway/plugin/trafficControl'))
gateway.use(require('../gateway/plugin/createSession'))
gateway.use(require('../gateway/plugin/antiRobot'))
gateway.start()