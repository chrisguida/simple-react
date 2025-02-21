import { useParams } from "react-router-dom";
import { useEffect } from "react";

export default function AffiliateLogger() {
    let { pubkey } = useParams();

    useEffect(() => {
        console.log("Affiliate pubkey:", pubkey);
    }, [pubkey]);

    return <div>Affiliate Pubkey: {pubkey}</div>;
}
