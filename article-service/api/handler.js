
'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const title = requestBody.title;
  const content = requestBody.content;
  const tags = requestBody.tags;
 
  if (typeof title !== 'string' || typeof content !== 'string' || typeof tags !== 'array') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t submit article because of validation errors.'));
    return;
  }
 
  submitArticleP(ArticleData(title, content, tags))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted article`,
          candidateId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit article`
        })
      })
    });
};

const submitArticleP = article => {
  console.log('Submitting article');
  const articleData = {
    TableName: process.env.ARTICLES_TABLE,
    Item: article,
  };
  return dynamoDb.put(articleData).promise()
    .then(res => article);
};

const articleData = (title, content, tag) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    title: title,
    content: content,
    tag: tag,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};

module.exports.list = (event, context, callback) => {
  var params = {
      TableName: process.env.ARTICLES_TABLE,
      ProjectionExpression: "id, title, content, tag"
  };

  console.log("Scanning Candidate table.");
  const onScan = (err, data) => {
      if (err) {
          console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
          callback(err);
      } else {
          console.log("Scan succeeded.");
          return callback(null, {
              statusCode: 200,
              body: JSON.stringify({
                  candidates: data.Items
              })
          });
      }
  };
  dynamoDb.scan(params, onScan);
};

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.ARTICLES_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };
  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch article.'));
      return;
    });
};