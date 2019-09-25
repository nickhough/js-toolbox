import _ from 'lodash';
import moment from 'moment-timezone';
import pluralize from 'pluralize';

export default class Model {

  constructor(config = {}) {

    const {
      _excluded,
      _fields,
      _settings,
      ...rest
    } = config;

    this._settings = _settings;

    this._data = rest || {};

    this.setFields(_fields);

    this.setExcluded(_excluded);

    this.setDefaultValues();

    this.setValues();

    this.checkRequiredFields();

    this.removeExcludedFields();
  }

  get archived() {
    return this.deletedAt ? moment(this.deletedAt).isValid() : false;
  }

  get exists() {
    return this.id !== null;
  }

  setFields(fields = {}) {
    this._fields = {
      id: {
        type: Number,
      },
      createdAt: {
        type: moment,
      },
      updatedAt: {
        type: moment,
      },
      deletedAt: {
        type: moment,
      },
      ...fields,
    };
  }

  setExcluded(excluded = []) {
    this._excluded = [
      '_attributes',
      '_data',
      '_excluded',
      '_relationships',
      '_type',
      '_fields',
      '_settings',
      ...excluded,
    ];
  }

  setDefaultValues() {

    for (let [key, value] of Object.entries(this._fields)) {

      if (typeof value.default !== undefined) {

        if (typeof value.default === 'function') {
          this[key] = value.default();
        } else {
          this[key] = value.default;
        }

      }
    }
  }

  setValues() {

    for (let [key, value] of Object.entries(this._data)) {

      if (this._excluded.indexOf(key) !== -1 || !value){
        continue;
      }

      // Create key
      key = _.camelCase(key);

      // Get field definition
      const field = this._fields[key];

      // Prevent infinite loop when objects have bi-directional relationships
      const modelExcludes = [
        _.camelCase(this.constructor.name),
        pluralize(_.camelCase(this.constructor.name)),
      ];

      if (field) {

        // Array
        if (field.type === Array) {

          const model = field.arrayOf;

          this[key] = value.map(item => new model({
            ...item,
            _excluded: [
              ...modelExcludes,
            ],
          }));

        }

        // Model
        else if (field.type.prototype instanceof Model) {

          const model = field.type;

          this[key] = new model({
            ...value,
            _excluded: [
              ...modelExcludes,
            ],
          });

        }

        // Moment or JS Date
        else if (field.type === moment || field.type === Date) {

          let timezone = this._settings.timezone || 'UTC';

          if (moment(value).isValid()) {
            this[key] = moment(value).tz(timezone);
          } else {
            this[key] = value;
            console.error('Invalid date', value);
          }

        }

        // Bool
        else if (field.type === Boolean) {
          this[key] = value === 1 || value === 'true' || value === true;
        }

        // Number
        else if (field.type === Number) {
          this[key] = Number(value);
        }

        // String
        else if (field.type === String) {
          this[key] = value.trim();
        }

        // Catch all
        else {
          this[key] = value;
        }

      } else {
        this[key] = value;
      }
    }
  }

  checkRequiredFields() {
    if (!this._settings.debug) {
      return;
    }

    for (let [key, value] of Object.entries(this._fields)) {
      if (value.required && this._data[key] === undefined) {
        console.error(`Missing required field: ${key}`);
      }
    }
  }

  removeExcludedFields() {
    if (this._settings.debug) {
      return;
    }

    const excluded = this._excluded;
    for (let [key, value] of Object.entries(this)) {
      if (excluded.indexOf(key) !== -1) {
        delete this[key];
      }
    }
  }
}