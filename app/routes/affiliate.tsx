import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AffiliateLogger() {
    const { pubkey } = useParams(); // Get pubkey from URL
    const [event, setEvent] = useState(null);
    const [nostr, setNostr] = useState(null);

    useEffect(() => {
        // Function to load a script dynamically
        const loadScript = (src, onLoad) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = onLoad;
            document.body.appendChild(script);
        };

        // Load noble-secp256k1 first
        loadScript("https://bundle.run/noble-secp256k1@1.2.14", () => {
            console.log("noble-secp256k1 loaded");

            // Load super_nostr after noble-secp256k1 is available
            loadScript("https://supertestnet.github.io/bankify/super_nostr.js", () => {
                console.log("super_nostr loaded");
                setNostr(window.super_nostr); // Attach super_nostr from window
            });
        });

        return () => {
            // Cleanup: remove scripts when component unmounts
            document.querySelectorAll("script[src*='super_nostr.js'], script[src*='noble-secp256k1']").forEach(script => {
                document.body.removeChild(script);
            });
        };
    }, []);

    useEffect(() => {
        if (!nostr || !pubkey) return;

        (async () => {
            try {
                const events = await nostr.getEvents(
                    "wss://relay.damus.io",
                    null, // No filters
                    [pubkey], // Pubkey from route param
                    [13166] // Kind number
                );

                if (events.length > 0) {
                    setEvent(events[0]); // Store event in state
                } else {
                    setEvent({ error: "No events found" });
                }
            } catch (error) {
                console.error("Error fetching event:", error);
                setEvent({ error: "Failed to fetch event" });
            }
        })();
    }, [nostr, pubkey]); // Fetch only when nostr & pubkey are available

    return (
        <div>
            <h2>Affiliate Pubkey: {pubkey}</h2>
            <pre>{event ? JSON.stringify(event, null, 2) : "Loading..."}</pre>
        </div>
    );
}
