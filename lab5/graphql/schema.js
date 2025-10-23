const { buildSchema } = require('graphql');

const graphqlSchema = buildSchema(`
  type Task {
    id: Int!
    title: String!
    status: String!
    dueDate: String
    attachments: [Attachment]
  }

  type Attachment {
    filename: String!
    originalName: String!
    path: String!
  }

  input TaskInput {
    title: String!
    dueDate: String
  }

  input TaskUpdateInput {
    id: Int!
    title: String
    status: String
    dueDate: String
  }

  type Query {
    tasks(status: String): [Task]
  }

  type Mutation {
    createTask(input: TaskInput): Task
    updateTask(input: TaskUpdateInput): Task
    deleteTask(id: Int!): Boolean
  }
`);

module.exports = { graphqlSchema };