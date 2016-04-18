var td = require("testdouble");
var loader = require("@loader");

require("../conditional");

QUnit.module("string substitution");

QUnit.module("with invalid cjs substitution module export", function(hooks) {
	hooks.beforeEach(function() {
		td.replace(loader, "fetch", function(load) {
			return load.name === "browser" ?
				Promise.resolve("module.exports = 42;") :
				Promise.reject();
		});
	});

	hooks.afterEach(function() {
		td.reset();
	});

	QUnit.test("rejects promise", testInvalidSubstitutionModuleExport);
});

QUnit.module("with invalid es6 substitution default export", function(hooks) {
	hooks.beforeEach(function() {
		loader.delete("browser");
		var oldFetch = this.oldFetch = loader.fetch;

		loader.fetch = function(load) {
			return load.name === "browser" ?
				Promise.resolve("export default 42;") :
				oldFetch.call(loader, load);
		};
	});

	hooks.afterEach(function() {
		loader.fetch = this.oldFetch;
	});

	QUnit.test("rejects promise", testInvalidSubstitutionModuleExport);
});

QUnit.module("with valid cjs substitution module export", function(hooks) {
	hooks.beforeEach(function() {
		loader.delete("browser");

		td.replace(loader, "fetch", function(load) {
			return load.name === "browser" ?
				Promise.resolve("module.exports = 'chrome';") :
				Promise.reject();
		});
	});

	hooks.afterEach(function() {
		td.reset();
	});

	QUnit.test("works", testValidSubstitutionExport);

	QUnit.test("sets conditionModule to be included in build",
			   testConditionModuleInBuild);
});

QUnit.module("with valid es6 substitution module export", function(hooks) {
	hooks.beforeEach(function() {
		loader.delete("browser");
		var oldFetch = this.oldFetch = loader.fetch;

		loader.fetch = function(load) {
			return load.name === "browser" ?
				Promise.resolve("export default 'chrome';") :
				oldFetch.call(loader, load);
		};
	});

	hooks.afterEach(function() {
		loader.fetch = this.oldFetch;
	});

	QUnit.test("works", testValidSubstitutionExport);

	QUnit.test("sets conditionModule to be included in build",
			   testConditionModuleInBuild);
});

QUnit.module("if substitution module exports a 'cases' property", function(hooks) {
	hooks.beforeEach(function() {
		td.replace(loader, "import", function(conditionModule) {
			var m = {default: "chrome", cases: ["chrome", "ie"]};

			return conditionModule === "browser" ?
				Promise.resolve(m) :
				Promise.reject();
		});
	});

	hooks.afterEach(function() {
		td.reset();
	});

	QUnit.test("adds the 'cases' modules to the bundles", function(assert) {
		var done = assert.async();

		// browser.hasFoo must be a boolean
		loader.normalize("jquery/#{browser}")
			.then(function(name) {
				assert.equal(loader.bundles["jquery/ie"], "jquery/ie");
				assert.equal(loader.bundles["jquery/chrome"], "jquery/chrome");
				assert.equal(name, "jquery/chrome");
				done();
			})
			.catch(function(err) {
				assert.notOk(err, "should not fail");
				done();
			});
	});
});


function testInvalidSubstitutionModuleExport(assert) {
	var done = assert.async();

	// browser's default export must be a string
	loader.normalize("jquery/#{browser}")
		.then(function() {
			assert.ok(false, "should be rejected");
			done();
		})
		.catch(function(err) {
			var re = /doesn't resolve to a string/;
			assert.ok(re.test(err.message));
			done();
		});
}

function testValidSubstitutionExport(assert) {
	var done = assert.async();

	// browser must default export a string
	loader.normalize("jquery/#{browser}")
		.then(function(name) {
			assert.equal(name, "jquery/chrome");
			done();
		})
		.catch(function(err) {
			assert.notOk(err, "should not fail");
			done();
		});
}

function testConditionModuleInBuild(assert) {
	var done = assert.async();

	// browser.hasFoo must be a boolean
	loader.normalize("jquery/#{browser}")
		.then(function(name) {
			var load = loader.getModuleLoad("browser");
			assert.ok(load.metadata.includeInBuild, "should be true");
			done();
		})
		.catch(function(err) {
			assert.notOk(err, "should not fail");
			done();
		});
}
