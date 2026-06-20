import * as admins from "./admins-schema.js";
import * as jobs from "./jobs-schema.js";

export const schema = {
    ...admins,
    ...jobs
};