import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AffiliateLogger() {
    const { pubkey } = useParams();
    const [event, setEvent] = useState(null);
    const [nostr, setNostr] = useState(null);
    const [classifiedEvents, setClassifiedEvents] = useState([]); // Store classified ads

    useEffect(() => {
        const loadScript = (src, onLoad) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = onLoad;
            document.body.appendChild(script);
        };

        // Load dependencies
        loadScript("https://bundle.run/noble-secp256k1@1.2.14", () => {
            console.log("noble-secp256k1 loaded");
            loadScript("https://supertestnet.github.io/bankify/super_nostr.js", () => {
                console.log("super_nostr loaded");
                loadScript("https://bundle.run/bech32@2.0.0", () => {
                    console.log("bech32 loaded");
                    setNostr(window.super_nostr);
                });
            });
        });

        return () => {
            document.querySelectorAll("script[src*='super_nostr.js'], script[src*='noble-secp256k1'], script[src*='bech32']").forEach(script => {
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

        // Extract `nevent` from the 13166 event
        const classifiedTag = event.tags.find(tag => tag[0] === "classified" && tag[1].startsWith("nevent"));

        if (!classifiedTag || !classifiedTag[1]) {
            console.warn("No valid nevent found in classified tag.");
            return;
        }

        const nevent = classifiedTag[1];

        // Decode `nevent` to get hex event ID
        let event_id;
        try {
            [event_id] = convertNEvent(nevent);
            if (!event_id) throw new Error("Invalid nevent decoded.");
        } catch (error) {
            console.error("Failed to decode nevent:", nevent, error);
            return;
        }

        console.log("Decoded nevent:", event_id);

        // Fetch classified ads using the extracted event ID
        (async () => {
            try {
                const fetchedEvents = await nostr.getEvents(
                    "wss://relay.damus.io",
                    [event_id] // Pass the extracted hex event ID
                );

                if (fetchedEvents.length > 0) {
                    setClassifiedEvents(fetchedEvents);
                } else {
                    setClassifiedEvents([]);
                }
            } catch (error) {
                console.error("Error fetching classified events:", error);
                setClassifiedEvents([]);
            }
        })();
    }, [nostr, event]);

    // Convert `nevent` into event ID & relays
    const convertNEvent = (nevent) => {
        try {
            var arr = bech32.bech32.fromWords(bech32.bech32.decode(nevent, 100_000).words);
            var hex = bytesToHex(arr);

            if (hex.length < 64) {
                throw new Error("Decoded hex string too short to contain a valid event ID.");
            }

            var event_id = hex.startsWith("0020") ? hex.substring(4, 68) : hex.substring(hex.length - 64);
            return [event_id];
        } catch (error) {
            console.error("convertNEvent error:", error);
            return [null]; // Return empty data on failure
        }
    };

    // Utility function for hex/text conversion
    const bytesToHex = (bytes) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

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

                    {/* Render classified ads */}
                    {classifiedEvents.length > 0 && (
                        <div style={styles.eventsContainer}>
                            <h3>Classified Listings</h3>
                            {classifiedEvents.map((classifiedEvent) => (
                                <div key={classifiedEvent.id} style={styles.card}>
                                    <img
                                        src={classifiedEvent.tags.find(tag => tag[0] === "featuredImageUrl")?.[1] || "https://via.placeholder.com/400"}
                                        alt="Featured"
                                        style={styles.cardImage}
                                    />
                                    <h3>{classifiedEvent.tags.find(tag => tag[0] === "title")?.[1] || "Untitled"}</h3>
                                    <p><b>Game:</b> {classifiedEvent.tags.find(tag => tag[0] === "game")?.[1] || "Unknown"}</p>
                                    <p>{classifiedEvent.tags.find(tag => tag[0] === "summary")?.[1] || "No description available"}</p>
                                    <p><b>Published By:</b> {classifiedEvent.tags.find(tag => tag[0] === "r")?.[1] || "Unknown"}</p>

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
                            ))}
                        </div>
                    )}
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
    eventsContainer: {
        marginTop: "20px",
        width: "100%",
        maxWidth: "400px",
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
        borderRadius: "8px",
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
styles.downloadButton[":hover"] = {
    backgroundColor: "#cc3700",
};
