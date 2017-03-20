import React from 'react';
import {AsyncTypeahead, Token} from 'react-bootstrap-typeahead';
import truncate from 'lodash/truncate';

import {getPathwayData, getHgncData} from '../../helpers/autocompleteData.js'

// SearchEngine
// Prop Dependencies ::
// - onChange
export class SearchEngine extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			optionsArray: [],
			inputString: "",
			pathwayCache: []
		}
		getPathwayData().then(pathwayArray => this.setState({
			pathwayCache:pathwayArray
		}));
	}

	generateLucene(itemArray) {
		var output = "";
		itemArray.map((value, index) => {
			output = output + value.field + ":" + value.name + (index === itemArray.length - 1 ? "" : " AND ");
		});
		this.props.onChange(output.trim());
	}

	generateOptions() {
		var inputString = this.state.inputString;
		var optionsArray = [{name:inputString,field:"name"}];
		var removeDefaultNew = false;
		var formatRegex = {
			uniprot: /^([A-N,R-Z][0-9]([A-Z][A-Z, 0-9][A-Z, 0-9][0-9]){1,2})|([O,P,Q][0-9][A-Z, 0-9][A-Z, 0-9][A-Z, 0-9][0-9])(\.\d+)?$/,
			chebi: /^CHEBI:\d+$/
		};

		Object.keys(formatRegex).map(key => {
			if(formatRegex[key].test(inputString) === true) {
				if(!removeDefaultNew) {
					optionsArray = [];
					removeDefaultNew = true;
				}
				optionsArray.push({
					name:inputString,
					field:"xrefid",
					format:key
				});
			}
		});

		if(inputString.toUpperCase() === inputString) {
			// Set optionsArray to symbols dataset
			if(!removeDefaultNew) {
				optionsArray = [];
				removeDefaultNew = true;
			}
			getHgncData(inputString).then(dataArray => {
				optionsArray.push(...dataArray);
				this.setState({optionsArray:optionsArray});
			});
		}
		else {
			// Set optionsArray to names dataset
			optionsArray.push(...this.state.pathwayCache);
		}
		this.setState({optionsArray:optionsArray});
	}

	render() {
		return (
			<AsyncTypeahead
				searchText="Searching..."
				multiple
				useCache={false}
				minLength={2}
				maxResults={10}
				delay={750}
				labelKey={option => option.format ? option.format.toUpperCase() + " → " + option.name : option.name}
				placeholder={this.props.placeholder}
				onInputChange={inputString => this.state.inputString = inputString}
				onSearch={() => this.generateOptions()}
				onChange={arr => this.generateLucene(arr)}
				options={this.state.optionsArray}
				renderToken={(option, onRemove, index) =>
					<Token
						key={index}
						onRemove={onRemove}>
						{truncate(option.name)}
					</Token>
				}
			/>
		);
	}
}
