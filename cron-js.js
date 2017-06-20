var nodemailer = require("nodemailer");
var MongoClient = require("mongodb").MongoClient;

var mongodbconnection;
var newjobcollection;
var emailpassword;
var emailaccount;
var receiveremail;
var transporter;

module.exports = function (ctx, cb) {
  //Get secrets
  mongodbconnection = ctx.secrets.mongodbconnection;
  newjobcollection = ctx.secrets.newjobcollection;
  emailaccount = ctx.secrets.emailaccount;
  emailpassword = ctx.secrets.emailpassword;
  receiveremail = ctx.secrets.receiveremail;

  //Create email transporter
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailaccount,
      pass: emailpassword
    }
  });

  getResults(function (err) {
     if (err) {
         console.log("had an error!", err);
     }
  });

  cb(null, {status: "Complete"});
};

function getResults(cb) {
    getConnection(function(err, collection) {
        if (err) {
          return cb(err);
        }

        collection.find({}, createMail);
    });
}

function getConnection(cb) {
    MongoClient.connect(mongodbconnection, function (err, db) {
        if (err) {
          return cb(err);
        }

        var jobCollection = db.collection(newjobcollection);
        cb(null, jobCollection);
    });
}

function createMail(err, jobs) {
    if (err) {
      return cb(err);
    }

    var resultString = '<table style="width:100%"><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Rating</th><th>URL</th></tr>';

    jobs.each(function(err, job) {
        if (err) {
          console.log("had an error!", err);
        }

        resultString = processJob(job, resultString);
    });
}

function processJob(job, resultString) {
    //Append data if we have a job object to process.
    if (job) {
        resultString += "<tr><td><b>" + job.jobTitle + "</b></td>" +
                        "<td>" + job.company + "</td>" +
                        "<td>" + job.location + "</td>" +
                        "<td>" + job.rating + "</td>" +
                        '<td><a href="' + job.link + '">Link</a></td>' +
                        "<td>" + job.source + "</td></tr>";
        return resultString;
    }

    //Once data has been processed, close html tags, trigger email and clean db.
    else {
      resultString += "</table>";
      email_results(resultString);

      //Remove all docs
      getConnection(function (err, collection) {
        if (err) {
          console.log("had an error!", err);
        }

        collection.remove( { } );
      });
    }
}

function email_results(results) {
  var mailOptions = {
    from: emailaccount,
    to: receiveremail,
    subject: "Jobs " + new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
    html: results
  };

  transporter.sendMail(mailOptions, function (error, info){
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
