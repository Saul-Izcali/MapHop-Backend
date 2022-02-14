const reportesGraficasController = {};

const mongoose = require('mongoose');
const fs = require('fs');

const reporte = require('../models/Reportes');
const usuario = require('../models/Usuarios');


reportesGraficasController.getReportes = async (req, res) => {
    // console.log(req.params.usuario)
    let aux = req.params.usuario;
    let separar = aux.split("$");
    console.log(separar);

    var getDaysInMonth = function(month, year) {
        return new Date(year, month, 0).getDate();
       };
       
    let ultimoDiaDelMes = getDaysInMonth(parseInt(separar[1], 10), parseInt(separar[2], 10))

    let start = separar[2]+'-'+separar[1]+'-01T14:48:00.000Z'
    let end = separar[2]+'-'+separar[1]+'-'+ultimoDiaDelMes+'T14:48:00.000Z'   // aqui debe estar la cantidad de dias que tiene este mes

    console.log(start)
    console.log(end)

    // AHORA DEBO BUSCAR EN LA BASE DE DATOS DEPENDIENDO POR MES Y AÑO
    const getReportes = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}}]})
    // const getReportes = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : ISODate("2022-01-01T00:00:00Z")}}, {"fechaCreacion" : {"$lte" : ISODate("2022-01-15T00:00:00Z")}}]})
    
    res.json(getReportes);
    // res.json(getReportes)
};


reportesGraficasController.getReportesGrafica2 = async (req, res) => {
    let aux = req.params.usuario;
    let separar = aux.split("$");
    console.log(separar);

    var getDaysInMonth = function(month, year) {
        return new Date(year, month, 0).getDate();
       };
       
    let ultimoDiaDelMes = getDaysInMonth(parseInt(separar[1], 10), parseInt(separar[2], 10))

    let start = separar[2]+'-'+separar[1]+'-01T14:48:00.000Z'
    let end = separar[2]+'-'+separar[1]+'-'+ultimoDiaDelMes+'T14:48:00.000Z'   // aqui debe estar la cantidad de dias que tiene este mes

    // La primera busqueda obtiene los reportes solucionados durante el mes dado
    // la otra obtiene el resto de reportes dentro de ese mes
    let reportesSolucionados = await reporte.find({"$and" : [{"fechaSolucion" : {"$gte" : start}}, {"fechaSolucion" : {"$lte" : end}}, {estado: 'Solucionado'} ]})
    let reporteshechos = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}} ]})
    // let reportesSolucionados = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}}, {estado: 'Solucionado'} ]})
    // let reportesNoSolucionados = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}}, {estado: {$ne: 'Solucionado'}} ]})

    let solucionados = reportesSolucionados;
    let elResto = reporteshechos;

    res.json({ solucionados, elResto})
};


reportesGraficasController.getReportesGrafica5 = async (req, res) => {
    let aux = req.params.usuario;
    let separar = aux.split("$");
    console.log(separar);

    let start = separar[1] + '-01-01T14:48:00.000Z'
    let end = separar[1]+'-12-31T14:48:00.000Z' 
   
    console.log(start)
    console.log(end)

    let getReportes = await reporte.find({"$and" : [{"fechaCreacion" : {"$gte" : start}}, {"fechaCreacion" : {"$lte" : end}}, {"cronico" : true}]})

    res.json(getReportes)
};


module.exports = reportesGraficasController;