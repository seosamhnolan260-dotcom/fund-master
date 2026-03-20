import StorageFileApi from './packages/StorageFileApi';
import StorageBucketApi from './packages/StorageBucketApi';
export class StorageClient extends StorageBucketApi {
    constructor(supabaseKey, url, headers = {}, fetch) {
        super(supabaseKey, url, headers, fetch);
    }
    /**
     * Perform file operation in a bucket.
     *
     * @param id The bucket id to operate on.
     */
    from(id) {
        return new StorageFileApi(this.supabaseKey, this.url, this.headers, id, this.fetch);
    }
}
//# sourceMappingURL=StorageClient.js.map