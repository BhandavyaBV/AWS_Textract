import axios from 'axios';
import AWS from 'aws-sdk'
AWS.config.update({ region: 'us-east-1' });
const cloudformation = new AWS.CloudFormation();

export const handler = async (event) => {
    console.log(event.Records[0].s3);
  const bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    key = key.replace("%40","@")
    var emailId = key.split("_")[1].replace("%40","@");
    console.log(key)
    console.log(emailId)

    const stackName = 'cloudFormation1';  // Replace with your stack name
    const { Stacks } = await cloudformation.describeStacks({ StackName: stackName }).promise();
    const apiEndpointOutput = Stacks[0].Outputs.find(output => output.OutputKey === 'ApiEndpoint')
    const stateMachineArnOutput = Stacks[0].Outputs.find(output => output.OutputKey === 'StateMachineArn');

        // Retrieve the State Machine ARN from the output
        const stateMachineArn = stateMachineArnOutput.OutputValue;

    
//      // Define the input for your Step Function
    const input = {
        // Your input data goes here
        bucket:bucket ,
        key: key,
        email:emailId
    };

//     // Define the ARN of your Step Function
    // const stateMachineArn = 'arn:aws:states:us-east-1:462258285762:stateMachine:MyStateMachine-wj2p5jya9';

//     // Start or invoke the Step Function
    const params = {
        stateMachineArn: stateMachineArn,
        input: JSON.stringify(input)
    };
    
    console.log(params)
    console.log(apiEndpointOutput.OutputValue)

    try {
        const result = await axios.post(apiEndpointOutput.OutputValue,params);
        console.log('Step Function execution started:', result);
        return { statusCode: 200, body: 'Step Function execution started' };
    } catch (error) {
        console.error('Error starting Step Function execution:', error);
        return { statusCode: 500, body: 'Error starting Step Function execution' };
    }
};
