document.addEventListener('DOMContentLoaded', function () {
    const resourceList = document.getElementById('resource-list');
    const searchInput = document.getElementById('search');
    const conditionFilter = document.getElementById('condition-filter');
    const regionFilters = document.getElementById('region-filters');
    const costFilters = document.getElementById('cost-filters');
    const virtualFilter = document.getElementById('virtual-filter');
    const clearFiltersButton = document.getElementById('clear-filters');
    const searchStatus = document.getElementById('search-status');
    const noResultsMessage = document.getElementById('no-results-message');
    const resultsCount = document.getElementById('results-count');
    
    //creating filter bubble sets for the 3 categories: region, cost, virtual
    const filterBubbles = {
        'region': new Set(),
        'cost': new Set(),
        'virtual': new Set()
    };

    //set for all resources to be stored
    let allResources = []; 

    M.FormSelect.init(document.querySelectorAll('select'));

    // getting the resources
    fetch('files/resources.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            const resources = Papa.parse(data, { header: true }).data;
            allResources = resources; 
            console.log('Parsed resources:', resources); 
            displayResources(resources);
            populateFilters(resources);
            initializeAutocomplete(resources);
            filterResources();
            resultsCount.textContent = `Number of results found: ${resources.length}`; 
        })
        .catch(error => {
            console.error('Error fetching or parsing the CSV file:', error);
        });

    //displaying the resources
    function displayResources(resources) {
        resourceList.innerHTML = '';
        resources.forEach(resource => {
            const resourceCard = document.createElement('div');
            resourceCard.className = 'resource-card';
            resourceCard.innerHTML = `
                <div>
                    <h5>${resource['Name of Organization']}</h5>
                    <p class="condition">${resource['Condition(s)']}</p>
                    <p>${resource['Health Region']}</p>
                </div>
                <a href="resource.html?name=${encodeURIComponent(resource['Name of Organization'])}" class="btn view-resource">View Resource</a>
            `;
            resourceList.appendChild(resourceCard);
        });

        resultsCount.textContent = `Number of results found: ${resources.length}`;
    }

    function populateFilters(resources) {
        const conditions = new Set();
        const regions = new Set();
        const costs = new Set();
        const virtualOptions = new Set();

        resources.forEach(resource => {
            resource['Condition(s)'].split(';').forEach(condition => conditions.add(condition.trim()));
            regions.add(resource['Health Region']);
            costs.add(resource['Cost']);
            virtualOptions.add(resource['Virtual/In-person']);
        });

        const sortedConditions = Array.from(conditions).sort();
        const sortedRegions = Array.from(regions).sort();
        const sortedCosts = Array.from(costs).sort();
        const sortedVirtualOptions = Array.from(virtualOptions).sort();

        conditionFilter.innerHTML = '<option value="" disabled selected>Choose Condition</option>'; 
        sortedConditions.forEach(condition => {
            const option = document.createElement('option');
            option.value = condition;
            option.textContent = condition;
            conditionFilter.appendChild(option);
        });

        M.FormSelect.init(document.querySelectorAll('select'));

        sortedRegions.forEach(region => {
            const bubble = document.createElement('div');
            bubble.className = 'filter-bubble';
            bubble.textContent = region;
            bubble.dataset.value = region;
            bubble.addEventListener('click', () => toggleFilter(bubble, 'region'));
            regionFilters.appendChild(bubble);
        });

        sortedCosts.forEach(cost => {
            const bubble = document.createElement('div');
            bubble.className = 'filter-bubble';
            bubble.textContent = cost;
            bubble.dataset.value = cost;
            bubble.addEventListener('click', () => toggleFilter(bubble, 'cost'));
            costFilters.appendChild(bubble);
        });

        sortedVirtualOptions.forEach(option => {
            const bubble = document.createElement('div');
            bubble.className = 'filter-bubble';
            bubble.textContent = option;
            bubble.dataset.value = option;
            bubble.addEventListener('click', () => toggleFilter(bubble, 'virtual'));
            virtualFilter.appendChild(bubble);
        });
    }

    function toggleFilter(bubble, type) {
        const value = bubble.dataset.value;

        document.querySelectorAll(`#${type}-filters .filter-bubble`).forEach(b => {
            if (b !== bubble) b.classList.remove('selected');
        });

        bubble.classList.toggle('selected');
        if (bubble.classList.contains('selected')) {
            filterBubbles[type].add(value);
        } else {
            filterBubbles[type].delete(value);
        }

        console.log('Filter bubbles:', filterBubbles); 
        filterResources();
    }

    function initializeAutocomplete(resources) {
        const autocompleteData = {};
        resources.forEach(resource => {
            autocompleteData[resource['Name of Organization']] = null;
        });

        M.Autocomplete.init(searchInput, {
            data: autocompleteData,
            onAutocomplete: function() {
                filterResources();
            }
        });
    }

    searchInput.addEventListener('input', () => filterResources());
    conditionFilter.addEventListener('change', () => filterResources());
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        conditionFilter.selectedIndex = 0;
        document.querySelectorAll('.filter-bubble.selected').forEach(bubble => bubble.classList.remove('selected'));
        filterBubbles['region'] = new Set();
        filterBubbles['cost'] = new Set();
        filterBubbles['virtual'] = new Set();
        filterResources();
    });

    function filterResources() {
        const searchValue = searchInput.value.toLowerCase();
        const conditionValue = conditionFilter.value;

        let filteredResources = allResources.slice(); 

        if (searchValue) {
            filteredResources = filteredResources.filter(resource =>
                resource['Name of Organization'].toLowerCase().includes(searchValue) ||
                (resource['Tags'] && resource['Tags'].toLowerCase().includes(searchValue))
            );
        }
        
        if (conditionValue) {
            filteredResources = filteredResources.filter(resource => resource['Condition(s)'].includes(conditionValue));
        }
        
        if (filterBubbles['region'].size > 0) {
            filteredResources = filteredResources.filter(resource => filterBubbles['region'].has(resource['Health Region']));
        }
        
        if (filterBubbles['cost'].size > 0) {
            filteredResources = filteredResources.filter(resource => filterBubbles['cost'].has(resource['Cost']));
        }
        
        if (filterBubbles['virtual'].size > 0) {
            filteredResources = filteredResources.filter(resource => filterBubbles['virtual'].has(resource['Virtual/In-person']));
        }

        if (filteredResources.length === 0) {
            noResultsMessage.style.display = 'block';
            resultsCount.style.display = 'none';
        } else {
            noResultsMessage.style.display = 'none';
            resultsCount.style.display = 'block';
            resultsCount.textContent = `Number of results found: ${filteredResources.length}`;
        }

        searchStatus.style.display = 'block';
        displayResources(filteredResources);
    }

    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        document.querySelectorAll(".nav-link").forEach(link => {
            const linkPath = new URL(link.href, window.location.origin).pathname;
            console.log(`Current Path: ${currentPath}, Link Path: ${linkPath}`);
            if (currentPath === linkPath) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }

    setActiveNavLink();
});
