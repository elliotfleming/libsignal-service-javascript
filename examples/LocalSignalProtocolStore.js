

// const helpers = require("../src/helpers.js");
const ByteBuffer = require('bytebuffer');
const {LocalStorage} = require('node-localstorage');

const _call = (object) => Object.prototype.toString.call(object);

const ArrayBufferToString = _call(new ArrayBuffer(0));
const Uint8ArrayToString = _call(new Uint8Array());

function _getString(thing) {
  if (typeof thing !== 'string') {
    if (_call(thing) === Uint8ArrayToString) {
      return String.fromCharCode.apply(null, thing);
    }
    if (_call(thing) === ArrayBufferToString) {
      return _getString(new Uint8Array(thing));
    }
  }

  return thing;
}

function _getStringable(thing) {
  return (
    typeof thing === 'string' ||
    typeof thing === 'number' ||
    typeof thing === 'boolean' ||
    (thing === Object(thing) &&
      (_call(thing) === ArrayBufferToString ||
        _call(thing) === Uint8ArrayToString))
  );
}

function _ensureStringed(thing) {
  if (_getStringable(thing)) {
    return _getString(thing);
  }
  if (thing instanceof Array) {
    const res = [];
    for (let i = 0; i < thing.length; i += 1) {
      res[i] = _ensureStringed(thing[i]);
    }

    return res;
  }
  if (thing === Object(thing)) {
    const res = {};
    for (const key in thing) {
      res[key] = _ensureStringed(thing[key]);
    }

    return res;
  }
  if (thing === null) {
    return null;
  }
  if (thing === undefined) {
    return undefined;
  }
  throw new Error(`unsure of how to jsonify object of type ${typeof thing}`);
}

function _jsonThing(thing) {
  return JSON.stringify(_ensureStringed(thing));
}

class Storage {
  constructor(path) {
    this._store = new LocalStorage(path);
  }

  _put(namespace, id, data) {
    this._store.setItem(`${  namespace  }@${id}`, _jsonThing(data));
  }

  _putAll(namespace, data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        this._store.setItem(`${  namespace  }@${item.id}`, _jsonThing(item));
      }
    }
  }

  _get(namespace, id) {
    const value = this._store.getItem(`${  namespace  }@${id}`);
    return JSON.parse(value, (key, value) => {
      switch (key) {
        case 'privKey':
        case 'privateKey':
        case 'pubKey':
        case 'publicKey':
          return ByteBuffer.wrap(value, 'binary').toArrayBuffer();
        default:
          return value;
      }
    });
  }

  _getAll(namespace) {
    const collection = [];
    for (const id of this._store._keys) {
      if (id.startsWith(namespace)) {
        collection.push(JSON.parse(this._store.getItem(id)));
      }
    }
    return collection;
  }

  // _getAllIds(namespace) {
  //  const collection = [];
  //  for (const key of this._store._keys) {
  //    if (key.startsWith(namespace)) {
  //      const { id } = this._get('', JSON.stringify(key));
  //      collection.push(id);
  //    }
  //  }
  //  return collection;
  // }

  _remove(namespace, id) {
    this._store.removeItem(`${  namespace  }@${id}`);
  }

  _removeAll(namespace) {
    for (const id of this._store._keys) {
      if (id.startsWith(namespace)) {
        this._remove('', id);
      }
    }
  }

  async removeAll() {
    this._store.clear();
  }

  // IdentityKeys
  async createOrUpdateIdentityKey(data) {
    const { id } = data;
    console.log('***createOrUpdateIdentityKey***:', data);
    this._put('identityKey', id, data);
  }

  async getIdentityKeyById(id) {
    const data = this._get('identityKey', id);
    console.log('***getIdentityKey***:', data);
    return data;
  }

  async bulkAddIdentityKeys(data) {
    this._putAll('identityKey', data);
  }

  async removeIdentityKeyById(id) {
    this._remove('identityKey', id);
  }

  async removeAllIdentityKeys() {
    this._removeAll('identityKey');
  }

  async getAllIdentityKeys() {
    return this._getAll('identityKey');
  }

  // Sessions
  async createOrUpdateSession(data) {
    const { id } = data;
    this._put('session', id, data);
  }

  async getSessionById(id) {
    return this._get('session', id);
  }

  async bulkAddSessions(data) {
    this._putAll('session', data);
  }

  async removeSessionById(id) {
    this._remove('session', id);
  }

  async removeSessionsByConversation(conversationId) {
    for (const id of this._store._keys) {
      if (id.startsWith('session')) {
        const session = this._get('', id);
        if (session.conversationId === conversationId) {
          this._remove('', id);
        }
      }
    }
  }

  async removeAllSessions() {
    this._removeAll('session');
  }

  async getAllSessions() {
    return this._getAll('session');
  }

  // PreKeys
  async createOrUpdatePreKey(data) {
    const { id } = data;
    this._put('25519KeypreKey', id.toString(), data);
  }

  async getPreKeyById(id) {
    return this._get('25519KeypreKey', id.toString());
  }

  async bulkAddPreKeys(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const { id } = item;
        this._put('25519KeypreKey', id.toString(), item);
      }
    }
  }

  async removePreKeyById(id) {
    this._remove('25519KeypreKey', id.toString());
  }

  async removeAllPreKeys() {
    return this._removeAll('25519KeypreKey');
  }

  async getAllPreKeys() {
    return this._getAll('25519KeypreKey');
  }

  // SignedPreKeys
  async createOrUpdateSignedPreKey(data) {
    const { id } = data;
    this._put('25519KeysignedKey', id.toString(), data);
  }

  async getSignedPreKeyById(id) {
    return this._get('25519KeysignedKey', id.toString());
  }

  async bulkAddSignedPreKeys(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const { id } = item;
        this._put('25519KeysignedKey', id.toString(), item);
      }
    }
  }

  async removeSignedPreKeyById(id) {
    this._remove('25519KeysignedKey', id.toString());
  }

  async removeAllSignedPreKeys() {
    this._removeAll('25519KeysignedKey');
  }

  async getAllSignedPreKeys() {
    return this._getAll('25519KeysignedKey');
  }

  // Unprocessed
  async getUnprocessedById(id) {
    return this._get('unprocessed', id);
  }

  async getUnprocessedCount() {
    let count = 0;
    for (const id of this._store._keys) {
      if (id.startsWith('unprocessed')) {
        count+= 1;
      }
    }
    return count;
  }

  async saveUnprocessed(data) {
    const { id } = data;
    this._put('unprocessed', id, data);
  }

  async saveUnprocesseds(data) {
    this._putAll('unprocessed', data);
  }

  async updateUnprocessedAttempts(id, attempts) {
    const data = this._get('unprocessed', id) || {};
    data.attempts = attempts;
    this._put('unprocessed', id, data);
  }

  async updateUnprocessedWithData(id, data) {
    this._put('unprocessed', id, data);
  }

  async updateUnprocessedsWithData(data) {
    this._putAll('unprocessed', data);
  }

  async removeUnprocessed(id) {
    this._remove('unprocessed', id);
  }

  async removeAllUnprocessed() {
    this._removeAll('unprocessed');
  }

  async getAllUnprocessed() {
    return this._getAll('unprocessed');
  }

  // Items
  async createOrUpdateItem(data) {
    const { id } = data;
    this._put('configuration', id, data);
  }

  async getItemById(id) {
    return this._get('configuration', id);
  }

  async bulkAddItems(data) {
    return this._putAll('configuration', data);
  }

  async removeItemById(id) {
    this._remove('configuration', id);
  }

  async removeAllItems() {
    this._removeAll('configuration');
  }

  async getAllItems() {
    return this._getAll('configuration');
  }

  // Conversations
  async createOrUpdateConversation(data) {
    const { id } = data;
    this._put('conversation', id, data);
  }

  async getConversationById(id) {
    return this._get('conversation', id);
  }

  async removeConversationById(id) {
    return this._remove('conversation', id);
  }

  async removeAllConversations() {
    return this._removeAll('conversation');
  }

  async getAllConversations() {
    return this._getAll('conversation');
  }
}

exports = module.exports = Storage;
