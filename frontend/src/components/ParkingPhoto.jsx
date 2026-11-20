import { CircleParking } from "lucide-react";
import { parkingImageUrl } from "../services/parkingImages";

export default function ParkingPhoto({ url, alt, className = "" }) {
    return <div className={`discovery-photo ${className}`}>
        {url ? <img src={parkingImageUrl(url)} alt={alt} /> : <div><CircleParking size={34} aria-hidden="true" /><span>No listing photos</span></div>}
    </div>;
}
