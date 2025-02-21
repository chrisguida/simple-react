import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AffiliateLogger() {
    const { pubkey } = useParams(); // Get pubkey from URL
    const [event, setEvent] = useState(null);
    const [nostr, setNostr] = useState(null);
    const [classifiedEvent, setClassifiedEvent] = useState(null); // Store kind-30402 event

    useEffect(() => {
        // Function to load external scripts dynamically
        const loadScript = (src, onLoad) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = onLoad;
            document.body.appendChild(script);
        };

        // Load noble-secp256k1 first, then super_nostr
        loadScript("https://bundle.run/noble-secp256k1@1.2.14", () => {
            console.log("noble-secp256k1 loaded");
            loadScript("https://supertestnet.github.io/bankify/super_nostr.js", () => {
                console.log("super_nostr loaded");
                setNostr(window.super_nostr);
            });
        });

        return () => {
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

    // Fetch a kind-30402 event when a classified "nevent" tag is found
    useEffect(() => {
        if (!nostr || !event) return;

        const classifiedTag = event.tags.find(tag => tag[0] === "classified" && tag[1] === "nevent");

        if (classifiedTag) {
            (async () => {
                try {
                    const randomEvents = await nostr.getEvents(
                        "wss://relay.damus.io",
                        null, // No filters
                        null, // Fetch from any pubkey
                        [30402] // Kind number
                    );

                    if (randomEvents.length > 0) {
                        setClassifiedEvent(randomEvents[Math.floor(Math.random() * randomEvents.length)]);
                    } else {
                        setClassifiedEvent({ error: "No kind-30402 events found" });
                    }
                } catch (error) {
                    console.error("Error fetching classified event:", error);
                    setClassifiedEvent({ error: "Failed to fetch classified event" });
                }
            })();
        }
    }, [nostr, event]); // Fetch when nostr & event are available

    return (
        <div style={styles.container}>
            <h2>Affiliate Pubkey</h2>
            <p>{pubkey}</p>

            {event ? (
                <div style={styles.linkContainer}>
                    {event.tags
                        .filter(tag => tag[0] === "link") // Extract only "link" tags
                        .map((tag, index) => (
                            <a key={index} href={tag[1]} target="_blank" rel="noopener noreferrer" style={styles.linkButton}>
                                {tag[2] || tag[1]} {/* Show text if available, otherwise show URL */}
                            </a>
                        ))}

                    {/* Render classified event JSON if found */}
                    {classifiedEvent && (
                        <pre style={styles.jsonBox}>
                            {JSON.stringify(classifiedEvent, null, 2)}
                        </pre>
                    )}
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
}

// Inline styles for the Linktree-like layout
const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#121212",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
    },
    linkContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "80%",
        maxWidth: "400px",
        marginTop: "20px",
    },
    linkButton: {
        display: "block",
        textAlign: "center",
        backgroundColor: "#1DB954",
        color: "#fff",
        textDecoration: "none",
        padding: "12px",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: "bold",
        transition: "0.3s",
    },
    jsonBox: {
        backgroundColor: "#222",
        padding: "10px",
        borderRadius: "8px",
        textAlign: "left",
        width: "100%",
        maxWidth: "400px",
        overflowY: "auto",  // Add vertical scrolling
        maxHeight: "300px",  // Limit height
        whiteSpace: "pre-wrap",
        fontSize: "12px", // Reduce font size
        lineHeight: "1.2", // Reduce spacing
    },
};

// Add hover effect
styles.linkButton[":hover"] = {
    backgroundColor: "#17a74b",
};
