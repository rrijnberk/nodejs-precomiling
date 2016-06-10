(function () {
	'use strict';

	var sys = require("sys"),
		my_http = require("http"),
		path = require("path"),
		url = require("url"),
		filesys = require("fs"),
		doT = require("dot"),
		cache = require("npm-svb-cache")(),
		dotCache = {},
		regex = {
			url: /^(.*)\/(.*)\.(.*)|(.*)\/(.*)$/
		},
		root = 'public',
		templateDir = 'templates',
		markupDir = 'markups';

	doT.templateSettings = {
		evaluate: /\(\{([\s\S]+?)\}\)/g,
		interpolate: /\(\{=([\s\S]+?)\}\)/g,
		encode: /\(\{!([\s\S]+?)\}\)/g,
		use: /\(\{#([\s\S]+?)\}\)/g,
		define: /\(\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\)/g,
		conditional: /\(\{\?(\?)?\s*([\s\S]*?)\s*\}\)/g,
		iterate: /\(\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\))/g,
		varname: 'i18n',
		strip: true,
		append: true,
		selfcontained: false
	};


	function getFullPath(urlData) {
		var uri = urlData.path.concat('/').concat(urlData.file).concat('.').concat(urlData.extension);
		return path.join(process.cwd(), root, markupDir, uri);
	}

	/**
	 * Creates/Retrieves the cached dots
	 * @param path The path for a file
	 * @param file The name of a file
	 * @returns {*} A template when available
	 */
	function getTemplate(path, file) {
		if (!dotCache[path]) {
			dotCache[path] = {
				ctime: new Date(),
				dots: doT.process({path: './public/templates'.concat(path)})
			};
		}
		return dotCache[path].dots[file];
	}

	/**
	 * @param url The url to split up in parts
	 * @returns {{extension: (*|string), file: (*|string), path: (*|string)}}
	 */
	function getUrlData(url) {
		var result;
		if (regex.url.test(url)) {
			result = regex.url.exec(url);
			return {
				extension: result[3] || 'html',
				file: result[2] || 'index',
				path: result[1] || [result[4], result[5]].join('/')
			};
		}
	}

	my_http.createServer(function (request, response) {
		console.log(cache);

		sys.puts('--> ' + (new Date()).getTime());

		var my_path = url.parse(request.url).pathname,
			urlData = getUrlData(my_path),
			template,
			full_path = getFullPath(urlData);

		function send404Response() {
			response.writeHeader(404, {"Content-Type": "text/plain"});
			response.write("404 Not Found\n");
			response.end();
		}

		function send500Response(err) {
			response.writeHeader(500, {"Content-Type": "text/plain"});
			response.write(err + "\n");
			response.end();
		}

		function send200Response(content) {
			response.writeHeader(200);
			response.write(content, "binary");
			response.end();
		}

		function handleFileReaderResult(err, file) {
			if(err) {
				send500Response(err);
			} else {
				send200Response(file);
			}
		}

		function handleTemplate() {
			template = getTemplate(urlData.path, urlData.file);
			if(!template) {
				send404Response();
			} else {
				var content = template({
					header: 'Hello my friends'
				});

				send200Response(content);
				storeContent(content);
			}
		}

		function loadResponse(fileCallback, templateCallback) {
			filesys.exists(full_path, function (exists) {
				if (exists) {
					fileCallback();
				} else {
					templateCallback();
				}
			});
		}

		function storeContent(content) {
			var fd = filesys.openSync(full_path, 'a');
			filesys.writeSync(fd, content);
			filesys.closeSync(fd);
		}

		loadResponse(function () {
			filesys.readFile(full_path, "binary", handleFileReaderResult);
		}, handleTemplate);

		//filesys.exists(full_path, function (exists) {
		//	if (!exists) {
		//		template = getTemplate(urlData.path, urlData.file);
		//		if(!template) {
		//			send404Resonse();
		//		} else {
		//			console.log('Displaying template');
		//
		//			var content = template({
		//				header: 'Hello my friends'
		//			});
		//
		//			response.writeHeader(200);
		//			response.write(content, "binary");
		//			response.end();
		//
		//			var fd = filesys.openSync(full_path, 'a');
		//			filesys.writeSync(fd, content);
		//			filesys.closeSync(fd);
		//
		//		}
		//	} else {
		//		filesys.readFile(full_path, "binary", handleFileReaderResult);
		//	}
		//});

		sys.puts('<-- ' + (new Date()).getTime());
	}).listen(8080);
	sys.puts("Server Running on 8080");

}());
