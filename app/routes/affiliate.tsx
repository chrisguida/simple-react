import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AffiliateLogger() {
    const { pubkey } = useParams();
    const [event, setEvent] = useState(null);
    const [nostr, setNostr] = useState(null);
    const [classifiedEvent, setClassifiedEvent] = useState(null);

    useEffect(() => {
        const loadScript = (src, onLoad) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = onLoad;
            document.body.appendChild(script);
        };

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
                    null,
                    [pubkey],
                    [13166]
                );

                if (events.length > 0) {
                    setEvent(events[0]);
                } else {
                    setEvent({ error: "No events found" });
                }
            } catch (error) {
                console.error("Error fetching event:", error);
                setEvent({ error: "Failed to fetch event" });
            }
        })();
    }, [nostr, pubkey]);

    useEffect(() => {
        if (!nostr || !event) return;

        const classifiedTag = event.tags.find(tag => tag[0] === "classified" && tag[1] === "nevent");

        if (classifiedTag) {
            (async () => {
                try {
                    const randomEvents = await nostr.getEvents(
                        "wss://relay.damus.io",
                        null,
                        null,
                        [30402]
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
    }, [nostr, event]);

    return (
        <div style={styles.container}>
            <h2>Affiliate Pubkey</h2>
            <p>{pubkey}</p>

            {event && (
                <div style={styles.linkContainer}>
                    {event.tags
                        .filter(tag => tag[0] === "link")
                        .map((tag, index) => (
                            <a key={index} href={tag[1]} target="_blank" rel="noopener noreferrer" style={styles.linkButton}>
                                {tag[2] || tag[1]}
                            </a>
                        ))}

                    {/* Render the classified event as a card */}
                    {classifiedEvent && !classifiedEvent.error && (
                        <div style={styles.card}>
                            <img
                                src={classifiedEvent.tags.find(tag => tag[0] === "featuredImageUrl")?.[1] || "https://via.placeholder.com/400"}
                                alt="Featured"
                                style={styles.cardImage}
                            />
                            <h3>{classifiedEvent.tags.find(tag => tag[0] === "title")?.[1] || "Untitled"}</h3>
                            <p><b>Game:</b> {classifiedEvent.tags.find(tag => tag[0] === "game")?.[1] || "Unknown"}</p>
                            <p>{classifiedEvent.tags.find(tag => tag[0] === "summary")?.[1] || "No description available"}</p>
                            <p><b>Published By:</b> {classifiedEvent.tags.find(tag => tag[0] === "r")?.[1] || "Unknown"}</p>
                            
                            {/* Download link if available */}
                            {classifiedEvent.tags.find(tag => tag[0] === "downloadUrls") && (
                                <a
                                    href={JSON.parse(classifiedEvent.tags.find(tag => tag[0] === "downloadUrls")?.[1])?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={styles.downloadButton}
                                >
                                    Download
                                </a>
                            )}
                        </div>
                    )}

                    {classifiedEvent?.error && <p>{classifiedEvent.error}</p>}
                </div>
            )}
        </div>
    );
}

// Styles
const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
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
    card: {
        backgroundColor: "#222",
        padding: "20px",
        borderRadius: "10px",
        textAlign: "center",
        width: "100%",
        maxWidth: "400px",
        marginTop: "20px",
    },
    cardImage: {
        width: "100%",
        borderRadius: "10px",
        marginBottom: "10px",
    },
    downloadButton: {
        display: "block",
        backgroundColor: "#ff4500",
        color: "#fff",
        textDecoration: "none",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: "bold",
        marginTop: "10px",
        transition: "0.3s",
    },
};

// Hover effects
styles.linkButton[":hover"] = {
    backgroundColor: "#17a74b",
};
styles.downloadButton[":hover"] = {
    backgroundColor: "#cc3700",
};
