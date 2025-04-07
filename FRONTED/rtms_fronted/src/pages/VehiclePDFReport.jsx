import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#2a4e6e',
    color: '#FFFFFF',
    fontWeight: 'bold',
    padding: 4,
    fontSize: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  tableCell: {
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd',
    fontSize: 9,
    justifyContent: 'center',
  },
  image: {
    width: 40,
    height: 40,
    objectFit: 'cover',
    margin: 'auto',
  },
});

const VehiclePDFReport = ({ vehicles }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Management Report</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
      </View>

      <View style={styles.table}>
        {/* Header Row with ID column */}
        <View style={styles.tableRow}>
          <View style={[styles.tableHeader, { width: '10%' }]}><Text>#</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Image</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Plate</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Type</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Max Weight</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Driver</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Owner</Text></View>
          <View style={[styles.tableHeader, { width: '15%' }]}><Text>Status</Text></View>
        </View>

        {/* Data Rows */}
        {vehicles.map((vehicle, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={[styles.tableCell, { width: '10%' }]}>
              <Text>{index + 1}</Text>
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Image style={styles.image} src={vehicle.photoUrl} />
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Text>{vehicle.plate}</Text>
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Text>{vehicle.type}</Text>
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Text>{vehicle.maxWeight?.toString()} kg</Text>
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Text>{vehicle.driver}</Text>
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Text>{vehicle.owner}</Text>
            </View>
            <View style={[styles.tableCell, { width: '15%' }]}>
              <Text>{vehicle.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default VehiclePDFReport;
