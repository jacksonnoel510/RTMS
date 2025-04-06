import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40
  },
  header: {
    marginBottom: 20,
    textAlign: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd'
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableHeader: {
    backgroundColor: '#2a4e6e',
    color: '#FFFFFF',
    fontWeight: 'bold',
    padding: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd'
  },
  tableCell: {
    padding: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dddddd',
    fontSize: 10
  }
});

const VehiclePDFReport = ({ vehicles }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Management Report</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableRow}>
          <View style={[styles.tableHeader, { width: '20%' }]}><Text>Plate Number</Text></View>
          <View style={[styles.tableHeader, { width: '20%' }]}><Text>Type</Text></View>
          <View style={[styles.tableHeader, { width: '20%' }]}><Text>Max Weight</Text></View>
          <View style={[styles.tableHeader, { width: '20%' }]}><Text>Driver</Text></View>
          <View style={[styles.tableHeader, { width: '20%' }]}><Text>Status</Text></View>
        </View>

        {/* Table Rows */}
        {vehicles.map((vehicle, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={[styles.tableCell, { width: '20%' }]}><Text>{vehicle.plate}</Text></View>
            <View style={[styles.tableCell, { width: '20%' }]}><Text>{vehicle.type}</Text></View>
            <View style={[styles.tableCell, { width: '20%' }]}><Text>{vehicle.maxWeight} kg</Text></View>
            <View style={[styles.tableCell, { width: '20%' }]}><Text>{vehicle.driver}</Text></View>
            <View style={[styles.tableCell, { width: '20%' }]}><Text>{vehicle.status}</Text></View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default VehiclePDFReport;