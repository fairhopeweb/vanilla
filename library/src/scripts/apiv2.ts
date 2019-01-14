/**
 * Entrypoint for the APIv2 calls. Prepulates an axios instance with some config settings.
 *
 * @copyright 2009-2019 Vanilla Forums Inc.
 * @license GPL-2.0-only
 */

import { formatUrl, t } from "@library/application";
import { isFileImage, indexArrayByKey } from "@library/utility";
import axios from "axios";
import qs from "qs";
import { IEmbedData, IFileEmbed } from "@library/embeds";
import { IFieldError, LoadStatus, ILoadable } from "@library/@types/api";

function fieldErrorTransformer(responseData) {
    if (responseData.status >= 400 && responseData.errors && responseData.errors.length > 0) {
        responseData.errors = indexArrayByKey(responseData.errors, "field");
    }

    return responseData;
}

const apiv2 = axios.create({
    baseURL: formatUrl("/api/v2/"),
    headers: {
        common: {
            "X-Requested-With": "vanilla",
        },
    },
    transformResponse: [...(axios.defaults.transformResponse as any), fieldErrorTransformer],
    paramsSerializer: params => qs.stringify(params),
});

export default apiv2;

/**
 * Upload an image using Vanilla's API v2.
 *
 * @param file - The file to upload.
 *
 * @throws If the file given is not an image. You must check yourself first.
 */
export async function uploadImage(image: File): Promise<IEmbedData> {
    if (!isFileImage(image)) {
        throw new Error(
            `Unable to upload an image of type ${image.type}. Supported formats included .gif, .jpg and .png`,
        );
    }

    const data = new FormData();
    data.append("file", image, image.name);
    data.append("type", "image");

    const result = await apiv2.post("/media", data);
    result.data.type = "image";
    return result.data;
}

/**
 * Upload an image using Vanilla's API v2.
 *
 * @param file - The file to upload.
 */
export async function uploadFile(file: File): Promise<IFileEmbed> {
    const data = new FormData();
    data.append("file", file, file.name);
    data.append("type", "file");

    const result = await apiv2.post("/media", data);
    return result.data;
}

/**
 * Extract a field specific error from an ILoadable if applicable.
 *
 * @param loadable - The loadable to extract from.
 * @param field - The field to extract.
 *
 * @returns an array of IFieldErrors if found or undefined.
 */
export function getFieldErrors(loadable: ILoadable<any>, field: string): IFieldError[] | undefined {
    if (loadable.status === LoadStatus.ERROR || loadable.status === LoadStatus.LOADING) {
        if (loadable.error && loadable.error.errors && loadable.error.errors[field]) {
            return loadable.error.errors[field];
        }
    }
}

/**
 * Extract a global error message out of an ILoadable if applicable.
 *
 * @param loadable - The loadable to extract from.
 * @param validFields - Field to check for overriding fields errors from. A global error only shows if there are no valid field errors.
 *
 * @returns A global error message or an undefined.
 */
export function getGlobalErrorMessage(loadable: ILoadable<any>, validFields: string[]): string | undefined {
    if (loadable.status === LoadStatus.ERROR || loadable.status === LoadStatus.LOADING) {
        for (const field of validFields) {
            if (getFieldErrors(loadable, field)) {
                return;
            }
        }

        if (loadable.error) {
            return loadable.error.message || t("An error has occurred, please try again.");
        }
    }
}
