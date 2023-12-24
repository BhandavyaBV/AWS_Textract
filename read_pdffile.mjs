import AWS from 'aws-sdk';
const s3 = new AWS.S3();
const textract = new AWS.Textract();

export const handler = async (event) => {
  try {
    console.log(event)
    // Extract information about the uploaded object from the S3 event
    const bucket = event.bucket;
    const key = event.key;
    const email = event.email;

    // Retrieve the PDF file from S3
    const s3Params = {
      Bucket: bucket,
      Key: key,
    };

    const s3Object = await s3.getObject(s3Params).promise();
    const pdfContent = s3Object.Body;

    // Use AWS Textract to start text detection job
    const textractParams = {
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
    };

    const startResponse = await textract.startDocumentTextDetection(textractParams).promise();
    const jobId = startResponse.JobId;

    // Wait for Textract job to complete
    await waitForTextractJobCompletion(jobId);

    // Retrieve results once the job is complete
    const getResponse = await textract.getDocumentTextDetection({ JobId: jobId }).promise();
    
    // const formattedData = getResponse.Blocks.map(block=>{
    //   if(block.text)
    //     return block.text
    // })
    
    const formattedData = getResponse['Blocks'].filter(block=>{
      if(block.Text && block.BlockType=="LINE")
        return true
    }).map(block=>block.Text).join("/n ");
    
    // console.log(JSON.stringify(getResponse))

    // Log Textract response
    console.log('Textract Response:', JSON.stringify(formattedData));

    // Extracted text is available in getResponse.Blocks or other properties

    return {
      statusCode: 200,
      body: JSON.stringify({ message: formattedData,email:email ,id:key}),
    };
  } catch (error) {
    console.error('Error processing PDF file:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

async function waitForTextractJobCompletion(jobId) {
  const params = { JobId: jobId };
  let status = 'IN_PROGRESS';

  while (status === 'IN_PROGRESS') {
    await sleep(5000); // Wait for 5 seconds before checking job status
    const response = await textract.getDocumentTextDetection(params).promise();
    status = response.JobStatus;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
