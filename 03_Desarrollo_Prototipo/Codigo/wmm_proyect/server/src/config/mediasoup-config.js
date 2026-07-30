const constants = require('./constants');

const mediaCodecs = [
    {
        kind: 'audio',
        mimeType: constants.AUDIO.CODEC,
        clockRate: constants.AUDIO.CLOCK_RATE,
        channels: constants.AUDIO.CHANNELS,
        parameters: {},
        rtcpFeedback: [
            { type: 'transport-cc' },
            { type: 'nack' }
        ]
    }
];

const webRtcTransportOptions = {
    listenIps: [{ ip: '0.0.0.0', announcedIp: constants.NETWORK.HOST }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    listenPortRange: {
        min: constants.NETWORK.RTC_MIN_PORT,
        max: constants.NETWORK.RTC_MAX_PORT
    },
    initialAvailableOutgoingBitrate: 1000000,
    enableSctp: false,
    // Safety cap por transporte: ~2.5x el bitrate máximo de Opus (32 kbps)
    // con overhead RTP/UDP/IP (~40%) + FEC (~50%) = ~68 kbps peor caso
    // 80 kbps da margen sin estrangular la calidad
    maxIncomingBitrate: 80000,
    iceConsentTimeout: 5,
    enableRtcpMux: true
};

const workerSettings = {
    logLevel: 'warn',
    rtcMinPort: constants.NETWORK.RTC_MIN_PORT,
    rtcMaxPort: constants.NETWORK.RTC_MAX_PORT
};

module.exports = {
    mediaCodecs,
    webRtcTransportOptions,
    workerSettings
};
