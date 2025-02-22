import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AffiliateLogger() {
    const { pubkey } = useParams();
    const [event, setEvent] = useState(null);
    const [nostr, setNostr] = useState(null);
    const [classifiedEvents, setClassifiedEvents] = useState([]);
    const [expandedEvents, setExpandedEvents] = useState({});

    useEffect(() => {
        const loadScript = (src, onLoad) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = onLoad;
            document.body.appendChild(script);
        };

        loadScript("https://bundle.run/noble-secp256k1@1.2.14", () => {
            loadScript("https://supertestnet.github.io/bankify/super_nostr.js", () => {
                loadScript("https://bundle.run/bech32@2.0.0", () => {
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

                setEvent(events.length > 0 ? events[0] : { error: "No events found" });
            } catch (error) {
                console.error("Error fetching event:", error);
                setEvent({ error: "Failed to fetch event" });
            }
        })();
    }, [nostr, pubkey]);

    useEffect(() => {
        if (!nostr || !event) return;

        const classifiedTag = event.tags.find(tag => tag[0] === "classified" && tag[1].startsWith("nevent"));
        if (!classifiedTag || !classifiedTag[1]) return;

        let event_id;
        try {
            [event_id] = convertNEvent(classifiedTag[1]);
            if (!event_id) throw new Error("Invalid nevent decoded.");
        } catch (error) {
            console.error("Failed to decode nevent:", classifiedTag[1], error);
            return;
        }

        (async () => {
            try {
                const fetchedEvents = await nostr.getEvents("wss://relay.damus.io", [event_id]);
                setClassifiedEvents(fetchedEvents.length > 0 ? fetchedEvents : []);
            } catch (error) {
                console.error("Error fetching classified events:", error);
                setClassifiedEvents([]);
            }
        })();
    }, [nostr, event]);

    const convertNEvent = (nevent) => {
        try {
            const arr = bech32.bech32.fromWords(bech32.bech32.decode(nevent, 100_000).words);
            const hex = bytesToHex(arr);

            if (hex.length < 64) throw new Error("Decoded hex string too short.");
            return [hex.startsWith("0020") ? hex.substring(4, 68) : hex.substring(hex.length - 64)];
        } catch (error) {
            console.error("convertNEvent error:", error);
            return [null];
        }
    };

    const bytesToHex = (bytes) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

    const toggleExpand = (eventId) => {
        setExpandedEvents(prevState => ({
            ...prevState,
            [eventId]: !prevState[eventId]
        }));
    };

    return (
        <div style={styles.container}>
            <h2>Affiliate Pubkey</h2>
            <p>{pubkey}</p>

            {classifiedEvents.length > 0 && (
                <div style={styles.eventsContainer}>
                    <h3>Classified Listings</h3>
                    {classifiedEvents.map((classifiedEvent) => {
                        const title = classifiedEvent.tags.find(tag => tag[0] === "title")?.[1] || "Untitled";
                        const summary = classifiedEvent.tags.find(tag => tag[0] === "summary")?.[1] || "No description available";
                        const location = classifiedEvent.tags.find(tag => tag[0] === "location")?.[1] || "Unknown location";
                        const price = classifiedEvent.tags.find(tag => tag[0] === "price")?.slice(1)?.join(" ") || "Price not listed";
                        const discount = classifiedEvent.tags.find(tag => tag[0] === "discount")?.slice(1)?.join(" ") || "No discount";
                        const categories = classifiedEvent.tags.filter(tag => tag[0] === "t").map(tag => tag[1]);

                        const imageUrl = classifiedEvent.tags.find(tag => tag[0] === "featuredImageUrl")?.[1] || 
                            "https://btcpp.dev/static/img/dog_swimming.jpg";

                        return (
                            <div key={classifiedEvent.id} style={styles.card}>
                                <div 
                                    style={styles.titleContainer} 
                                    onClick={() => toggleExpand(classifiedEvent.id)}
                                >
                                    <h3 style={styles.title}>{title}</h3>
                                    <div style={styles.expandButton}>
                                        {expandedEvents[classifiedEvent.id] ? "▲" : "▼"}
                                    </div>
                                </div>
                                <p style={styles.summary}>{summary}</p>

                                {expandedEvents[classifiedEvent.id] && (
                                    <>
                                        <div style={styles.detailsContainer}>
                                            <div style={styles.detailRow}>
                                                <div style={styles.label}>Location:</div>
                                                <div style={styles.value}>{location}</div>
                                            </div>
                                            
                                            <div style={styles.detailRow}>
                                                <div style={styles.label}>Price:</div>
                                                <div style={styles.value}>{price}</div>
                                            </div>
                                            
                                            <div style={styles.detailRow}>
                                                <div style={styles.label}>Discount:</div>
                                                <div style={styles.value}>{discount}</div>
                                            </div>

                                            {categories.length > 0 && (
                                                <div style={styles.detailRow}>
                                                    <div style={styles.label}>Categories:</div>
                                                    <div style={styles.value}>{categories.join(", ")}</div>
                                                </div>
                                            )}
                                        </div>



                                        <img
                                            src={imageUrl}
                                            alt="Event"
                                            style={styles.cardImage}
                                        />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// **Restored Styles**
const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "#fff",
        fontFamily: "'Poppins', sans-serif",
        padding: "20px",
    },
    eventsContainer: {
        marginTop: "20px",
        width: "100%",
        maxWidth: "500px",
        display: "flex",
        flexDirection: "column",
    },
    card: {
        backgroundColor: "#1e1e1e",
        padding: "20px",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "500px",
        marginTop: "20px",
        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.3)",
    },
    cardImage: {
        width: "100%",
        borderRadius: "8px",
        marginTop: "10px",
    },
    titleContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
    },
    title: {
        fontSize: "26px",
        fontWeight: "bold",
        color: "#ffcc00",
        textAlign: "center",
        flex: 1,
    },
    summary: {
        fontSize: "16px",
        color: "#ccc",
        textAlign: "center",
    },
    detailsContainer: {
        display: "flex",
        flexDirection: "column", // Ensure fields stack vertically
        width: "100%",
        marginTop: "10px",
    },
    detailRow: {
        display: "grid",
        gridTemplateColumns: "120px auto", // Ensure label and value are aligned
        gap: "10px",
        alignItems: "start",
        width: "100%",
        marginBottom: "5px", // Add spacing between fields
    },
    label: {
        fontWeight: "bold",
        textAlign: "right",
        paddingRight: "10px",
        whiteSpace: "nowrap",
    },
    value: {
        textAlign: "left",
    },
};
