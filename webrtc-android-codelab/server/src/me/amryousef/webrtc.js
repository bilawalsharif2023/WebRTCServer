const signalingServerUrl = "ws://192.168.1.32:8080/connect";
let localStream;
let remoteStream;
let peerConnection;
let socket;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const disconnectButton = document.getElementById('disconnectButton');

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

startButton.addEventListener('click', startCall);
disconnectButton.addEventListener('click', disconnectCall);

function connectSocket() {
    socket = new WebSocket(signalingServerUrl);

    socket.onopen = () => {
        console.log('Connected to the signaling server');
    };

    socket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case 'OFFER':
                await handleOffer(data.offer);
                break;
            case 'ANSWER':
                await handleAnswer(data.answer);
                break;
            case 'candidate':
                await handleCandidate(data.candidate);
                break;
            default:
                break;
        }
    };

    socket.onclose = () => {
        console.log('Disconnected from the signaling server');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

async function startCall() {
    connectSocket();
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error('Error accessing media devices.', err);
    }

    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ type: 'OFFER', offer }));
    startButton.disabled = true;
    disconnectButton.disabled = false;
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            socket.send(JSON.stringify({ type: 'candidate', candidate }));
        }
    };

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    if (localStream) {
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

async function handleOffer(offer) {
    createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
}

function disconnectCall() {
    if (socket) {
        socket.close();
    }
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    disconnectButton.disabled = true;
}
