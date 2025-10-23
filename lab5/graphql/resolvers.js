const taskStore = require('../taskStore');

const graphqlResolvers = {
  tasks: async ({ status }, context) => {
    if (!context.user) throw new Error('Not authenticated');
    
    const userTasks = await taskStore.findTasksByUserId(context.user.userId, status);
    return userTasks;
  },

  task: async ({ id }, context) => {
    if (!context.user) throw new Error('Not authenticated');
    
    const task = await taskStore.findTaskById(id);
    if (!task || task.userId !== context.user.userId) {
      throw new Error('Task not found');
    }
    
    return task;
  },

  createTask: async ({ input }, context) => {
    if (!context.user) throw new Error('Not authenticated');

    const taskData = {
      title: input.title,
      dueDate: input.dueDate || null,
      userId: context.user.userId
    };

    const newTask = await taskStore.createTask(taskData);
    return newTask;
  },

  updateTask: async ({ input }, context) => {
    if (!context.user) throw new Error('Not authenticated');

    const task = await taskStore.findTaskById(input.id);
    if (!task || task.userId !== context.user.userId) {
      throw new Error('Task not found');
    }

    const updates = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.status !== undefined) updates.status = input.status;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate;

    const updatedTask = await taskStore.updateTask(input.id, updates);
    return updatedTask;
  },

  deleteTask: async ({ id }, context) => {
    if (!context.user) throw new Error('Not authenticated');

    const task = await taskStore.findTaskById(id);
    if (!task || task.userId !== context.user.userId) {
      throw new Error('Task not found');
    }

    const success = await taskStore.deleteTask(id);
    return success;
  }
};

module.exports = { graphqlResolvers };