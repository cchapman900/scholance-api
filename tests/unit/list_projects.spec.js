const assert = require('assert');

const dbMock = require('../mocks/db_mock');

const ProjectService = require('../../services/project.service');
const projectService = new ProjectService(dbMock);

// describe('Project Service', function() {
//     describe('#listProjects()', function() {
//         it('should do something', function() {
//             const projects = projectService.list({});
//             assert.ok(projects);
//         });
//     });
// });