import localForage from 'localforage';
import {search} from 'pathway-commons';
import pick from 'lodash/pick';

// The following concerns retrieving pathway data

function fetchSearch(pageNumber) {
	// Some code taken from fetch-retry
	return new Promise(function(resolve, reject) {
		var wrappedFetch = function(n) {
			if (n >= 0) {
				search()
					.q("*")
					.type("pathway")
					.page(pageNumber)
					.format("json")
					.fetch()
					.then(searchObj => {
						if (typeof searchObj === "object") {
							return searchObj.searchHit;
						} else {
							throw new Error();
						}
					})
					.then(resolvable => resolve(resolvable))
					.catch((e) => {
						console.log(e.message);
						wrappedFetch(--n);
					});
			}
		}
		wrappedFetch(5);
	});
}

function downloadPathwayArray() {
	return search() // Get the number of pages to fetch by querying the first page
		.q("*")
		.type("pathway")
		.format("json")
		.fetch()
		.then(resObj => {
			var numHitsTotal = resObj.numHits;
			var hitsPerPage = resObj.maxHitsPerPage;
			var numPages = Math.floor((numHitsTotal - 1) / hitsPerPage) + 1;
			return numPages;
		})
		.then(numPages => { // Create an array of fetch queries to be used later
			return Array(numPages).fill(0).map((x, i) => fetchSearch(i));
		})
		.then(promiseArray => { // Wait for all the fetch promises to finish
			return Promise.all(promiseArray);
		})
		.then(arrayList => { // Concatonate all of the result arrays into one array
			var output = [];
			for (var i = 0; i < arrayList.length; i++) {
				output = output.concat(arrayList[i]);
			}
			return output;
		})
		.then(pathwayObject => { // Eliminate unnecessary fields from data array
			return pathwayObject
				.filter(pathway => pathway.numParticipants ? pathway.numParticipants > 5 : pathway.size > 4) // Filter out smaller pathways
				.map(pathway => pick(pathway, ["name", "size", "numParticipants", "numProcesses", "dataSource"]))
				.map(pathway => { // Do necessary data manipulation for each pathway
					pathway.dataSource = pathway.dataSource[0];
					pathway.field = "name";
					return pathway;
				})
				.sort((a, b) => { // Sort it into alphabetical order
					var nameA = a.name.toUpperCase(); // ignore upper and lowercase
					var nameB = b.name.toUpperCase(); // ignore upper and lowercase
					if (nameA < nameB) {
						return -1;
					}
					if (nameA > nameB) {
						return 1;
					}
					// names must be equal
					return 0;
				});
		})
		.then(pathwayArray => { // Cache pathwayData in local storage
			localForage.setItem("pathwayData", pathwayArray);
			return pathwayArray;
		})
		.catch(e => console.error(e));
}

export let getPathwayData = function() {
	return localForage
		.getItem("pathwayData")
		.then(data => {
			if (data === null) {
				return downloadPathwayArray();
			} else {
				return data;
			}
		});
}

// The following concerns retrieving HGNC data

export let getHgncData = function(searchString) {
	return fetch("http://rest.genenames.org/search/symbol/" + searchString + "*", {
			headers: {
				'Accept': 'application/json'
			},
		})
		.then(res => res.json())
		.then(responseObject => {
			return responseObject.response.docs.map(hgncObject => {
				hgncObject.name = hgncObject.symbol;
				hgncObject.field = "xrefid";
				delete hgncObject.symbol;
				delete hgncObject.score;
				return hgncObject;
			});
		});
}
