import { HonoApp } from "../../type/env";
import uploadFiles from "./handler/uploadFiles";
import tusCreate from "./handler/tusCreate";
import tusPatch from "./handler/tusPatch";
import tusGet from "./handler/tusGet";
import tusHead from "./handler/tusHead";
import tusDelete from "./handler/tusDelete";
import tusOptions from "./handler/tusOptions";

export default function uploadRoute(app: HonoApp) {
    uploadFiles(app); // Non-TUS upload handler
    
    // TUS Protocol handlers - using Durable Object
    tusCreate(app);
    tusPatch(app);
    tusHead(app);     // HEAD must come before GET to avoid conflicts
    tusGet(app);      // Re-enabled for file retrieval
    tusDelete(app);
    tusOptions(app);
}
