export default class StorageProviderInterface {
    providerName = "";
    constructor(name) {
        this.providerName = name;
    }

    save(_name, _object) {
        throw new Error("Save function not implemented");
    }
    read(_name) {
        throw new Error("Read function not implemented");
    }

    configure(_config) {}
}
