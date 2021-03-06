import model from '../models/index';

const Document = model.Document;

const errorHandler = errors => errors.map(error => error.message);

export default {

  /**
   * createDoc - Creates a document
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {object} Response Object
   */
  createDoc(req, res) {
    req.body.ownerId = req.decoded.UserId;
    return Document
      .create(req.body)
      .then(document => res.status(201).send(document))
      .catch(error => res.status(400).send({
        message: errorHandler(error.errors)
      }));
  },

  /**
   * listDocs - Lists all created documents
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {Object} Response Object
   */
  listDocs(req, res) {
    const limit = req.query.limit || '10';
    const offset = req.query.offset || '0';
    return Document
    .findAndCountAll({
      limit,
      offset,
      order: '"createdAt" DESC'
    })
    .then((documents) => {
      const metadata = limit && offset ? { totalCount: documents.count,
        pages: Math.ceil(documents.count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        pageSize: documents.rows.length } : null;
      res.status(200).send({ documents: documents.rows, metadata, });
    })
    .catch(error => res.status(400).send({
      message: error.message
    }));
  },

  /**
   * getDoc - Gets document by id
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {Object} Response Object
   */
  getDoc(req, res) {
    Document.findById(req.params.id)
      .then((foundDocument) => {
        if (!foundDocument) {
          return res.status(404)
          .send({
            message: 'Document Not Found'
          });
        }
        if (foundDocument.access === 'public') {
          return res.status(200)
            .send(foundDocument);
        }
        if ((foundDocument.access === 'private') &&
          (foundDocument.ownerId === req.decoded.UserId)) {
          return res.status(200)
            .send(foundDocument);
        }
        if (foundDocument.access === 'role') {
          return model.User.findById(foundDocument.ownerId)
            .then((documentOwner) => {
              if (documentOwner.RoleId === req.decoded.RoleId) {
                return res.status(200)
                  .send(foundDocument);
              }
              return res.status(401)
                .send({
                  message: 'You cannot view this document'
                });
            });
        }
        return res.status(401)
          .send({
            message: 'You cannot view this document'
          });
      })
      .catch(error => res.status(400).send({
        message: error.message
      }));
  },

  /**
   * getRoleDoc - Gets document by role that can access it
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {Object} Response Object
   */
  getRoleDoc(req, res) {
    const limit = req.query.limit;
    const offset = req.query.offset;
    return Document
    .findAndCountAll({
      where: { access: req.query.access },
      limit,
      offset,
      order: '"createdAt" DESC'
    })
    .then((documents) => {
      const metadata = limit && offset ? { totalCount: documents.count,
        pages: Math.ceil(documents.count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        pageSize: documents.rows.length } : null;
      res.status(200).send({ documents: documents.rows, metadata });
    })
    .catch(error => res.status(400).send({
      message: error.message
    }));
  },

  /**
   * searchDoc - search documents
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {Object} Response Object
   */
  searchDoc(req, res) {
    const userQuery = req.query.query;
    const query = {
      where: {
        $and: [{ $or: [
          { access: 'public' },
          { ownerId: req.decoded.UserId }
        ] }],
      },
      limit: req.query.limit,
      offset: req.query.offset,
      order: '"createdAt" DESC'
    };

    if (userQuery) {
      query.where.$and.push({ $or: [
        { title: { $like: `%${userQuery}%` } },
        { content: { $like: `%${userQuery}%` } }
      ] });
    }
    Document.findAndCountAll(query)
      .then((documents) => {
        const metadata = query.limit && query.offset
        ? { totalCount: documents.count,
          pages: Math.ceil(documents.count / query.limit),
          currentPage: Math.floor(query.offset / query.limit) + 1,
          pageSize: documents.rows.length } : null;
        res.send({ documents: documents.rows, metadata });
      })
      .catch(error => res.status(400).send({
        message: error.message
      }));
  },

  /**
   * updateDoc - Update document by id
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {Object} Response Object
   */
  updateDoc(req, res) {
    return Document
    .findById(req.params.id, {})
    .then((document) => {
      if (!document) {
        return res.status(404).send({
          message: 'Document Not Found',
        });
      }
      if (document.ownerId !== req.decoded.UserId) {
        return res.status(401).send({
          message: 'You cannot update this document'
        });
      }
      return document
        .update(req.body)
        .then(() => res.status(200).send(document));
    })
    .catch(error => res.status(400).send({
      message: error.message
    }));
  },

  /**
   * deleteDoc - Delete document by id
   * @param {Object} req Request Object
   * @param {Object} res Response Object
   * @returns {Object} Response Object
   */
  deleteDoc(req, res) {
    return Document
      .findById(req.params.id)
      .then((document) => {
        if (!document) {
          return res.status(400).send({
            message: 'Document Not Found',
          });
        }
        if (document.ownerId !== req.decoded.UserId) {
          return res.status(401).send({
            message: 'You cannot delete this document'
          });
        }
        return document
          .destroy()
          .then(() => res.status(200).send({
            message: 'Document Deleted'
          }));
      })
      .catch(error => res.status(400).send({
        message: error.message
      }));
  },
};
