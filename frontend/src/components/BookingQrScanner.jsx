import { useEffect, useRef, useState } from "react";

function decodeFrame(read, canvas, source, width, height) {
    const scale = Math.min(1, 900 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return read(image.data, image.width, image.height)?.data;
}

export default function BookingQrScanner({ onRead, onClose }) {
    const video = useRef(null);
    const callback = useRef(onRead);
    callback.current = onRead;
    const [error, setError] = useState("");
    const [camera, setCamera] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!camera) return;
        let closed = false;
        let stream;
        let timer;
        const canvas = document.createElement("canvas");
        const stop = () => {
            closed = true;
            clearInterval(timer);
            stream?.getTracks().forEach(track => track.stop());
        };
        (async () => {
            const { default: read } = await import("jsqr");
            if (closed) return;
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
            if (closed) { stop(); return; }
            const frame = video.current;
            frame.srcObject = stream;
            await frame.play();
            if (closed) return;
            timer = setInterval(() => {
                if (closed || !frame.videoWidth) return;
                const result = decodeFrame(read, canvas, frame, frame.videoWidth, frame.videoHeight);
                if (result) {
                    stop();
                    callback.current(result);
                }
            }, 170);
        })().catch(() => {
            if (!closed) {
                stop();
                setError("Camera unavailable. Try a QR image or enter the booking OTP.");
                setCamera(false);
            }
        });
        return stop;
    }, [camera]);

    async function readImage(event) {
        const input = event.currentTarget;
        const file = input.files[0];
        if (!file) return;
        setBusy(true);
        setError("");
        const url = URL.createObjectURL(file);
        try {
            const { default: read } = await import("jsqr");
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = document.createElement("canvas");
            const result = decodeFrame(read, canvas, image, image.naturalWidth, image.naturalHeight);
            if (!result) throw new Error("No QR code detected");
            callback.current(result);
        } catch {
            setError("No readable QR code was found. Try a clearer image or enter the booking OTP.");
        } finally {
            URL.revokeObjectURL(url);
            setBusy(false);
            input.value = "";
        }
    }

    return <section className="owner-panel booking-scanner">
        <div className="booking-actions"><h2>Scan parking pass</h2><button type="button" onClick={onClose}>Close scanner</button></div>
        <p>Use the camera or select a QR image. The image is decoded on this device.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        {camera ? <><video ref={video} muted playsInline aria-label="Parking QR camera preview" />
            <button type="button" onClick={() => setCamera(false)}>Stop camera</button></> :
            <button type="button" disabled={busy} onClick={() => { setError(""); setCamera(true); }}>Start camera</button>}
        <label>Scan QR image<input type="file" accept="image/*" disabled={busy || camera} onChange={readImage} /></label>
        {busy && <p role="status">Reading QR code…</p>}
    </section>;
}
