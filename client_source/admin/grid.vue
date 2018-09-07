<template>
	<table class="synapse">
		<thead>
			<tr>
				<th v-for="(val, key) in tableData[0]" @click="sortBy(key)"  :class="{ active: sortKey == key }" :key=key > 
					{{key}}
					<span v-show="sortKey == key"  class="arrow" :class="sortOrders[key] > 0 ? 'asc' : 'dsc'" />
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="item in filteredData" :key=item.key > 
				<td v-for="(val, key) in item" :key=key >{{ delim(key, val) }}</td>
			</tr>
		</tbody>
	</table>
</template>

<script>

export default {
	props: {
		tableData : Array,
		filterKey : String
	},

	data: function () {
    var sortOrders = {};
		Object.keys(this.tableData[0]).forEach(function (key) {
      sortOrders[key] = 1
    })
    return {
		  sortKey: '',
      sortOrders: sortOrders
    }
  },

	computed: {
    filteredData: function () {
      var sortKey = this.sortKey;
      var filterKey = this.filterKey && this.filterKey.toLowerCase();
      var order = this.sortOrders[sortKey] || 1;
      var data = this.tableData;
      if (filterKey) {
        data = data.filter(function (row) {
          return Object.keys(row).some(function (key) {
            return String(row[key]).toLowerCase().indexOf(filterKey) > -1
          })
        })
      }

      if (sortKey) {
        data = data.sort(function (a, b) {
          a = a[sortKey]
          b = b[sortKey]
          return (a === b ? 0 : a > b ? 1 : -1) * order
        })
      }
      return data
    }
  },
 
	methods : {
		sortBy: function (key) {
      this.sortKey = key
      this.sortOrders[key] = this.sortOrders[key] * -1
    },

		delim : function(key, val){
			if (/id/i.test(key)) return val;
			if (/ref/i.test(key)) return val;
			return (typeof val ==='number')
					? val.toString().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ')
				 	: val;
		}
	}
}
</script>

<style scoped>

table.synapse th{
	min-width: 150px;
	max-width: 350px;
 -webkit-user-select: none;
 -moz-user-select:  none;
 -ms-user-select: none;
  user-select: none;
}

table.synapse th:hover{
	color: #6C8CA9;
	transition: all .3s;
}

table.synapse td {
	-webkit-user-select: auto;
	-moz-user-select:  auto;
  -ms-user-select: auto;
	user-select: auto;
  padding: 3px 5px;
}

.arrow.asc:before {
	content:"\25B2";
}

.arrow.dsc:before{
	content:"\25BC";
}

</style>